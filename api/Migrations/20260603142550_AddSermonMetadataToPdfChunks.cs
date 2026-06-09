using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CacloukyLibrary.Migrations
{
    /// <inheritdoc />
    public partial class AddSermonMetadataToPdfChunks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SectionTitle",
                table: "PdfChunks",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SermonDate",
                table: "PdfChunks",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SectionTitle",
                table: "PdfChunks");

            migrationBuilder.DropColumn(
                name: "SermonDate",
                table: "PdfChunks");
        }
    }
}
