using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CacloukyLibrary.Migrations
{
    /// <inheritdoc />
    public partial class AddScriptureTeachings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ScriptureTeachings",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1").Annotation("Sqlite:Autoincrement", true),
                    Reference = table.Column<string>(maxLength: 100, nullable: false),
                    Book = table.Column<string>(maxLength: 100, nullable: false),
                    Chapter = table.Column<int>(nullable: false),
                    Verse = table.Column<int>(nullable: false),
                    Teaching = table.Column<string>(nullable: false),
                    GeneratedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScriptureTeachings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ScriptureTeachings_Book_Chapter_Verse",
                table: "ScriptureTeachings",
                columns: new[] { "Book", "Chapter", "Verse" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ScriptureTeachings");
        }
    }
}
