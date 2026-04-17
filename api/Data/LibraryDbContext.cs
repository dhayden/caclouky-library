using CacloukyLibrary.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace CacloukyLibrary.Data;

public class LibraryDbContext : IdentityDbContext<ApplicationUser>
{
    public LibraryDbContext(DbContextOptions<LibraryDbContext> options) : base(options) { }

    public DbSet<Book> Books => Set<Book>();
    public DbSet<Checkout> Checkouts => Set<Checkout>();
    public DbSet<Reservation> Reservations => Set<Reservation>();
    public DbSet<PdfDocument> PdfDocuments => Set<PdfDocument>();
    public DbSet<PdfChunk> PdfChunks => Set<PdfChunk>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Book>(b =>
        {
            b.HasIndex(x => x.ISBN).IsUnique();
            b.Property(x => x.Title).HasMaxLength(500).IsRequired();
            b.Property(x => x.Author).HasMaxLength(300).IsRequired();
            b.Property(x => x.ISBN).HasMaxLength(20).IsRequired();
        });

        builder.Entity<Checkout>(b =>
        {
            b.HasOne(x => x.Book).WithMany(x => x.Checkouts).HasForeignKey(x => x.BookId);
            b.HasOne(x => x.User).WithMany(x => x.Checkouts).HasForeignKey(x => x.UserId);
            b.Property(x => x.LateFee).HasColumnType("decimal(10,2)");
        });

        builder.Entity<Reservation>(b =>
        {
            b.HasOne(x => x.Book).WithMany(x => x.Reservations).HasForeignKey(x => x.BookId);
            b.HasOne(x => x.User).WithMany(x => x.Reservations).HasForeignKey(x => x.UserId);
            b.Property(x => x.Status).HasConversion<string>();
        });

        builder.Entity<PdfDocument>(b =>
        {
            b.Property(x => x.Title).HasMaxLength(500).IsRequired();
            b.Property(x => x.FileName).HasMaxLength(500).IsRequired();
        });

        builder.Entity<PdfChunk>(b =>
        {
            b.HasOne(x => x.Document).WithMany(x => x.Chunks).HasForeignKey(x => x.DocumentId).OnDelete(DeleteBehavior.Cascade);
            b.Property(x => x.Content).HasColumnType("nvarchar(max)");
            b.Property(x => x.Embedding).HasColumnType("nvarchar(max)");
        });
    }
}
