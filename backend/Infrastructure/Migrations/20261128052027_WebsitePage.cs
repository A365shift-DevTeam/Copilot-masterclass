using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class WebsitePage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SitePages",
                columns: table => new
                {
                    Key = table.Column<string>(type: "text", nullable: false),
                    Draft = table.Column<string>(type: "json", nullable: false),
                    Published = table.Column<string>(type: "json", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SitePages", x => x.Key);
                });

            migrationBuilder.CreateTable(
                name: "SitePublishes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PageKey = table.Column<string>(type: "text", nullable: false),
                    Snapshot = table.Column<string>(type: "json", nullable: false),
                    PublishedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    PublishedBy = table.Column<string>(type: "text", nullable: false),
                    Summary = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SitePublishes", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SitePublishes_PageKey_PublishedAt",
                table: "SitePublishes",
                columns: new[] { "PageKey", "PublishedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SitePages");

            migrationBuilder.DropTable(
                name: "SitePublishes");
        }
    }
}
