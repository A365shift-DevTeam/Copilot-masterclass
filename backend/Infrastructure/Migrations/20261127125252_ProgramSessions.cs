using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ProgramSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CourseSession",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CourseId = table.Column<int>(type: "integer", nullable: false),
                    StartsAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndsAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Language = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CourseSession", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CourseSession_Courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CourseSession_CourseId_StartsAt",
                table: "CourseSession",
                columns: new[] { "CourseId", "StartsAt" });

            // Keep the dates already set: each program's date becomes its first session, then the old columns go.
            migrationBuilder.Sql(@"INSERT INTO ""CourseSession"" (""CourseId"", ""StartsAt"", ""EndsAt"", ""Language"")
                SELECT ""Id"", ""StartsAt"", ""EndsAt"", ""Language"" FROM ""Courses"" WHERE ""StartsAt"" IS NOT NULL;");

            migrationBuilder.DropColumn(
                name: "EndsAt",
                table: "Courses");

            migrationBuilder.DropColumn(
                name: "Language",
                table: "Courses");

            migrationBuilder.DropColumn(
                name: "StartsAt",
                table: "Courses");

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CourseSession");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "EndsAt",
                table: "Courses",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Language",
                table: "Courses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "StartsAt",
                table: "Courses",
                type: "timestamp with time zone",
                nullable: true);
        }
    }
}
