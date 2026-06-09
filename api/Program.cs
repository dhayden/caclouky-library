using System.Text;
using CacloukyLibrary.Data;
using CacloukyLibrary.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ── Database ──────────────────────────────────────────────────────────────────
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<LibraryDbContext>(options =>
{
    if (string.IsNullOrEmpty(connectionString))
        options.UseSqlite("Data Source=caclouky.db")
               .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
    else
        options.UseSqlServer(connectionString);
});

// ── Identity ──────────────────────────────────────────────────────────────────
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 8;
    options.Password.RequireUppercase = false;
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<LibraryDbContext>()
.AddDefaultTokenProviders();

// ── JWT Auth ──────────────────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT Key not configured.");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly",        p => p.RequireRole("Admin"));
    options.AddPolicy("MinisterOrAdmin",  p => p.RequireRole("Admin", "Minister"));
    options.AddPolicy("AnyRole",          p => p.RequireRole("Admin", "Minister", "GeneralAssembly"));
});

// ── CORS ──────────────────────────────────────────────────────────────────────
var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:4200"];

builder.Services.AddCors(options =>
    options.AddPolicy("LibraryCors", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()));

// ── Swagger ───────────────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Caclouky Library API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Enter: Bearer {token}",
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }},
            Array.Empty<string>()
        }
    });
});

// ── Sermon Search Services ────────────────────────────────────────────────────
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<CacloukyLibrary.Services.OllamaService>();
builder.Services.AddHttpClient<CacloukyLibrary.Services.BibleService>();
builder.Services.AddScoped<CacloukyLibrary.Services.BibleService>();
builder.Services.AddScoped<CacloukyLibrary.Services.PdfIndexService>();
builder.Services.AddScoped<CacloukyLibrary.Services.SearchService>();
builder.Services.AddScoped<CacloukyLibrary.Services.ScripturePreloadService>();
builder.Services.AddSingleton<CacloukyLibrary.Services.ScripturePreloadStatus>();
builder.Services.AddSingleton<CacloukyLibrary.Services.IndexingQueue>();
builder.Services.AddSingleton<CacloukyLibrary.Services.IndexingStatus>();
builder.Services.AddHostedService<CacloukyLibrary.Services.IndexingWorker>();

builder.Services.AddControllers();

var app = builder.Build();

// ── Auto-migrate and seed roles ───────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<LibraryDbContext>();

    // For SQLite (no SQL Server connection string): bootstrap migration history
    // if the DB was originally created with EnsureCreated(), which never tracks migrations.
    // This preserves all existing data while letting Migrate() add only what's missing.
    if (string.IsNullOrEmpty(connectionString))
    {
        var conn = db.Database.GetDbConnection();
        bool opened = conn.State != System.Data.ConnectionState.Open;
        if (opened) conn.Open();
        try
        {
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='__EFMigrationsHistory'";
            if ((long)cmd.ExecuteScalar()! == 0)
            {
                cmd.CommandText = @"CREATE TABLE ""__EFMigrationsHistory"" (""MigrationId"" TEXT NOT NULL CONSTRAINT ""PK___EFMigrationsHistory"" PRIMARY KEY, ""ProductVersion"" TEXT NOT NULL)";
                cmd.ExecuteNonQuery();

                bool Has(string t) { cmd.CommandText = $"SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='{t}'"; return (long)cmd.ExecuteScalar()! > 0; }
                void Mark(string id) { cmd.CommandText = $@"INSERT INTO ""__EFMigrationsHistory"" VALUES ('{id}', '8.0.25')"; cmd.ExecuteNonQuery(); }
                void Run(string s) { cmd.CommandText = s; cmd.ExecuteNonQuery(); }

                // InitialCreate: mark applied if identity tables exist (they pre-date migrations).
                // Also create library tables (Books/Checkouts/Reservations) that EnsureCreated()
                // may have missed, using IF NOT EXISTS so existing data is untouched.
                if (Has("AspNetUsers"))
                {
                    Mark("20260324194846_InitialCreate");
                    Run(@"CREATE TABLE IF NOT EXISTS ""Books"" (""Id"" INTEGER NOT NULL CONSTRAINT ""PK_Books"" PRIMARY KEY AUTOINCREMENT, ""ISBN"" TEXT NOT NULL, ""Title"" TEXT NOT NULL, ""Author"" TEXT NOT NULL, ""Publisher"" TEXT, ""PublishedYear"" INTEGER, ""Genre"" TEXT, ""Description"" TEXT, ""CoverImageUrl"" TEXT, ""TotalCopies"" INTEGER NOT NULL, ""AvailableCopies"" INTEGER NOT NULL, ""CreatedAt"" TEXT NOT NULL)");
                    Run(@"CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Books_ISBN"" ON ""Books"" (""ISBN"")");
                    Run(@"CREATE TABLE IF NOT EXISTS ""Checkouts"" (""Id"" INTEGER NOT NULL CONSTRAINT ""PK_Checkouts"" PRIMARY KEY AUTOINCREMENT, ""BookId"" INTEGER NOT NULL, ""UserId"" TEXT NOT NULL, ""CheckedOutAt"" TEXT NOT NULL, ""DueDate"" TEXT NOT NULL, ""ReturnedAt"" TEXT, ""LateFee"" TEXT, CONSTRAINT ""FK_Checkouts_Books_BookId"" FOREIGN KEY (""BookId"") REFERENCES ""Books"" (""Id"") ON DELETE CASCADE, CONSTRAINT ""FK_Checkouts_AspNetUsers_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""AspNetUsers"" (""Id"") ON DELETE CASCADE)");
                    Run(@"CREATE INDEX IF NOT EXISTS ""IX_Checkouts_BookId"" ON ""Checkouts"" (""BookId"")");
                    Run(@"CREATE INDEX IF NOT EXISTS ""IX_Checkouts_UserId"" ON ""Checkouts"" (""UserId"")");
                    Run(@"CREATE TABLE IF NOT EXISTS ""Reservations"" (""Id"" INTEGER NOT NULL CONSTRAINT ""PK_Reservations"" PRIMARY KEY AUTOINCREMENT, ""BookId"" INTEGER NOT NULL, ""UserId"" TEXT NOT NULL, ""ReservedAt"" TEXT NOT NULL, ""AvailableAt"" TEXT, ""Status"" TEXT NOT NULL, CONSTRAINT ""FK_Reservations_Books_BookId"" FOREIGN KEY (""BookId"") REFERENCES ""Books"" (""Id"") ON DELETE CASCADE, CONSTRAINT ""FK_Reservations_AspNetUsers_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""AspNetUsers"" (""Id"") ON DELETE CASCADE)");
                    Run(@"CREATE INDEX IF NOT EXISTS ""IX_Reservations_BookId"" ON ""Reservations"" (""BookId"")");
                    Run(@"CREATE INDEX IF NOT EXISTS ""IX_Reservations_UserId"" ON ""Reservations"" (""UserId"")");
                    // AddIsRestrictedToBook not marked — Migrate() will add the column to Books
                }

                if (Has("PdfDocuments")) Mark("20260415135840_AddSermonSearch");
                // AddBibleAndUserFeatures, AddNoteFolders, AddScriptureTeachings,
                // AddSermonMetadataToPdfChunks — left pending so Migrate() applies them

                // Full-text index migration uses raw SQL Server syntax; always skip on SQLite
                Mark("20260603194533_AddFullTextIndexOnPdfChunkContent");
            }
        }
        finally { if (opened) conn.Close(); }
    }

    db.Database.Migrate();

    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    foreach (var role in new[] { "Admin", "Minister", "GeneralAssembly" })
        if (!await roleManager.RoleExistsAsync(role))
            await roleManager.CreateAsync(new IdentityRole(role));

    // ── Seed admin user (runs once if no admin exists) ────────────────────────
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    const string adminEmail = "admin@caclouky.org";
    if (await userManager.FindByEmailAsync(adminEmail) == null)
    {
        var admin = new ApplicationUser
        {
            UserName = adminEmail,
            Email = adminEmail,
            FirstName = "Admin",
            LastName = "User",
            IsActive = true,
            MemberSince = DateTime.UtcNow
        };
        var result = await userManager.CreateAsync(admin, "Admin123@");
        if (result.Succeeded)
            await userManager.AddToRoleAsync(admin, "Admin");
    }

    // ── Seed test users ───────────────────────────────────────────────────────
    var testUsers = new[]
    {
        (Email: "minister@caclouky.org", First: "Minister", Last: "User", Password: "Minister123@", Role: "Minister"),
        (Email: "member@caclouky.org",   First: "Member",   Last: "User", Password: "Member123@",   Role: "GeneralAssembly"),
    };
    foreach (var (Email, First, Last, Password, Role) in testUsers)
    {
        if (await userManager.FindByEmailAsync(Email) == null)
        {
            var u = new ApplicationUser { UserName = Email, Email = Email, FirstName = First, LastName = Last, IsActive = true, MemberSince = DateTime.UtcNow };
            var r = await userManager.CreateAsync(u, Password);
            if (r.Succeeded) await userManager.AddToRoleAsync(u, Role);
        }
    }

    // ── Book seed (runs whenever DB is empty) ─────────────────────────────────
    if (!db.Books.Any())
    {
        db.Books.AddRange(
            new Book { ISBN="9780310903994", Title="The Purpose Driven Life",   Author="Rick Warren",     Publisher="Zondervan",        PublishedYear=2002, Genre="Christian Living",      TotalCopies=3, AvailableCopies=3, CoverImageUrl="https://covers.openlibrary.org/b/isbn/9780310903994-L.jpg", Description="A guide to discovering the meaning and purpose of your life through God's plan." },
            new Book { ISBN="9780743261951", Title="The Case for Christ",        Author="Lee Strobel",     Publisher="Zondervan",        PublishedYear=1998, Genre="Christian Apologetics",  TotalCopies=2, AvailableCopies=2, CoverImageUrl="https://covers.openlibrary.org/b/isbn/9780743261951-L.jpg", Description="A former atheist journalist investigates the evidence for Jesus Christ." },
            new Book { ISBN="9780785288008", Title="Mere Christianity",          Author="C.S. Lewis",      Publisher="HarperOne",        PublishedYear=1952, Genre="Christian Apologetics",  TotalCopies=3, AvailableCopies=3, CoverImageUrl="https://covers.openlibrary.org/b/isbn/9780785288008-L.jpg", Description="C.S. Lewis presents a rational case for the Christian faith." },
            new Book { ISBN="9780060649890", Title="The Screwtape Letters",      Author="C.S. Lewis",      Publisher="HarperOne",        PublishedYear=1942, Genre="Christian Fiction",      TotalCopies=2, AvailableCopies=2, CoverImageUrl="https://covers.openlibrary.org/b/isbn/9780060649890-L.jpg", Description="A senior demon instructs a junior tempter on how to corrupt a human soul." },
            new Book { ISBN="9781400202275", Title="Redeeming Love",             Author="Francine Rivers",  Publisher="Multnomah",        PublishedYear=1991, Genre="Christian Fiction",      TotalCopies=2, AvailableCopies=2, CoverImageUrl="https://covers.openlibrary.org/b/isbn/9781400202275-L.jpg", Description="A powerful retelling of the story of Hosea set in the 1850s Gold Rush." },
            new Book { ISBN="9780736957762", Title="Jesus Calling",              Author="Sarah Young",     Publisher="Thomas Nelson",    PublishedYear=2004, Genre="Devotional",             TotalCopies=3, AvailableCopies=3, CoverImageUrl="https://covers.openlibrary.org/b/isbn/9780736957762-L.jpg", Description="A devotional with messages from Jesus written in the first person." },
            new Book { ISBN="9780802412867", Title="Knowing God",                Author="J.I. Packer",     Publisher="InterVarsity Press",PublishedYear=1973, Genre="Christian Theology",     TotalCopies=2, AvailableCopies=2, CoverImageUrl="https://covers.openlibrary.org/b/isbn/9780802412867-L.jpg", Description="A classic exploration of the nature and attributes of God." },
            new Book { ISBN="9780764228919", Title="The Hiding Place",           Author="Corrie ten Boom", Publisher="Chosen Books",     PublishedYear=1971, Genre="Christian Biography",    TotalCopies=2, AvailableCopies=2, CoverImageUrl="https://covers.openlibrary.org/b/isbn/9780764228919-L.jpg", Description="The true story of Corrie ten Boom's survival in Nazi concentration camps." },
            new Book { ISBN="9780802415851", Title="Desiring God",               Author="John Piper",      Publisher="Multnomah",        PublishedYear=1986, Genre="Christian Living",       TotalCopies=2, AvailableCopies=2, CoverImageUrl="https://covers.openlibrary.org/b/isbn/9780802415851-L.jpg", Description="John Piper's vision of Christian hedonism — God is most glorified when we are most satisfied in Him." },
            new Book { ISBN="9780385508391", Title="The Pilgrim's Progress",     Author="John Bunyan",     Publisher="Penguin Classics",  PublishedYear=1678, Genre="Christian Classics",    TotalCopies=2, AvailableCopies=2, CoverImageUrl="https://covers.openlibrary.org/b/isbn/9780385508391-L.jpg", Description="An allegory of the Christian journey from the City of Destruction to the Celestial City." },
            new Book { ISBN="9780449213445", Title="The Chosen",                 Author="Chaim Potok",     Publisher="Ballantine Books",  PublishedYear=1967, Genre="Christian Fiction",     TotalCopies=2, AvailableCopies=2, CoverImageUrl="https://covers.openlibrary.org/b/isbn/9780449213445-L.jpg", Description="A story of friendship between two Jewish boys in Brooklyn." }
        );
        await db.SaveChangesAsync();
    }

    // ── Seed KJV Bible (runs once if table is empty) ──────────────────────────
    var bible = scope.ServiceProvider.GetRequiredService<CacloukyLibrary.Services.BibleService>();
    if (!bible.IsSeeded())
    {
        // Create a new scope so the DbContext isn't disposed when the seed runs
        _ = Task.Run(async () =>
        {
            using var seedScope = app.Services.CreateScope();
            var svc = seedScope.ServiceProvider.GetRequiredService<CacloukyLibrary.Services.BibleService>();
            await svc.SeedAsync();
        });
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseCors("LibraryCors");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Serve Angular SPA static files (production)
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");

app.Run();
