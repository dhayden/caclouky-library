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
            // Wrapped in TRY/CATCH: SQL Server Express and older editions don't support Full-Text Search.
            // The migration is recorded as applied either way; LIKE-based text search remains the fallback.
            // EXEC() defers parsing to runtime so TRY/CATCH can swallow errors on SQL Server Express
            // or any edition without Full-Text Search installed. LIKE-based text search is the fallback.
            migrationBuilder.Sql(@"
                BEGIN TRY
                    EXEC('
                        IF NOT EXISTS (SELECT * FROM sys.fulltext_catalogs WHERE name = ''FTCatalog'')
                            CREATE FULLTEXT CATALOG FTCatalog AS DEFAULT;
                        IF NOT EXISTS (SELECT * FROM sys.fulltext_indexes WHERE object_id = OBJECT_ID(''PdfChunks''))
                            CREATE FULLTEXT INDEX ON PdfChunks(Content)
                                KEY INDEX PK_PdfChunks
                                ON FTCatalog
                                WITH CHANGE_TRACKING AUTOMATIC;
                    ')
                END TRY
                BEGIN CATCH
                END CATCH
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                BEGIN TRY
                    IF EXISTS (SELECT * FROM sys.fulltext_indexes WHERE object_id = OBJECT_ID('PdfChunks'))
                        DROP FULLTEXT INDEX ON PdfChunks;
                END TRY
                BEGIN CATCH
                END CATCH
            ");
        }
    }
}
