using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CacloukyLibrary.Migrations
{
    /// <inheritdoc />
    public partial class AddNoteFolders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "FolderId",
                table: "UserNotes",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "NoteFolders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Color = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NoteFolders", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserNotes_FolderId",
                table: "UserNotes",
                column: "FolderId");

            migrationBuilder.CreateIndex(
                name: "IX_NoteFolders_UserId",
                table: "NoteFolders",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_UserNotes_NoteFolders_FolderId",
                table: "UserNotes",
                column: "FolderId",
                principalTable: "NoteFolders",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UserNotes_NoteFolders_FolderId",
                table: "UserNotes");

            migrationBuilder.DropTable(
                name: "NoteFolders");

            migrationBuilder.DropIndex(
                name: "IX_UserNotes_FolderId",
                table: "UserNotes");

            migrationBuilder.DropColumn(
                name: "FolderId",
                table: "UserNotes");
        }
    }
}
