using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CacloukyLibrary.Migrations
{
    /// <inheritdoc />
    public partial class AddBibleAndUserFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BibleVerses",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1").Annotation("Sqlite:Autoincrement", true),
                    BookNumber = table.Column<int>(nullable: false),
                    Book = table.Column<string>(nullable: false),
                    Chapter = table.Column<int>(nullable: false),
                    Verse = table.Column<int>(nullable: false),
                    Text = table.Column<string>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BibleVerses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SearchHistories",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1").Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<string>(nullable: false),
                    Query = table.Column<string>(nullable: false),
                    Type = table.Column<string>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SearchHistories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserHighlights",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1").Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<string>(nullable: false),
                    SourceType = table.Column<string>(nullable: false),
                    SourceRef = table.Column<string>(nullable: false),
                    SelectedText = table.Column<string>(nullable: false),
                    Color = table.Column<string>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserHighlights", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserNotes",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1").Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<string>(nullable: false),
                    Title = table.Column<string>(nullable: false),
                    Content = table.Column<string>(nullable: false),
                    SourceType = table.Column<string>(nullable: true),
                    SourceRef = table.Column<string>(nullable: true),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserNotes", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BibleVerses_Book_Chapter_Verse",
                table: "BibleVerses",
                columns: new[] { "Book", "Chapter", "Verse" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BibleVerses_BookNumber_Chapter_Verse",
                table: "BibleVerses",
                columns: new[] { "BookNumber", "Chapter", "Verse" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchHistories_UserId",
                table: "SearchHistories",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserHighlights_UserId_SourceType_SourceRef",
                table: "UserHighlights",
                columns: new[] { "UserId", "SourceType", "SourceRef" });

            migrationBuilder.CreateIndex(
                name: "IX_UserNotes_UserId",
                table: "UserNotes",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BibleVerses");

            migrationBuilder.DropTable(
                name: "SearchHistories");

            migrationBuilder.DropTable(
                name: "UserHighlights");

            migrationBuilder.DropTable(
                name: "UserNotes");
        }
    }
}
