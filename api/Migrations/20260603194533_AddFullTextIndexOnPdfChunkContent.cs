using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CacloukyLibrary.Migrations
{
    /// <inheritdoc />
    public partial class AddFullTextIndexOnPdfChunkContent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // SQL Server only — SQLite uses EnsureCreated() and never runs migrations
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.fulltext_catalogs WHERE name = 'FTCatalog')
                    CREATE FULLTEXT CATALOG FTCatalog AS DEFAULT;
                IF NOT EXISTS (SELECT * FROM sys.fulltext_indexes WHERE object_id = OBJECT_ID('PdfChunks'))
                    CREATE FULLTEXT INDEX ON PdfChunks(Content)
                        KEY INDEX PK_PdfChunks
                        ON FTCatalog
                        WITH CHANGE_TRACKING AUTOMATIC;
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT * FROM sys.fulltext_indexes WHERE object_id = OBJECT_ID('PdfChunks'))
                    DROP FULLTEXT INDEX ON PdfChunks;
            ");
        }
    }
}
