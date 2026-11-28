using System.Text.Json.Nodes;
using Application.Common;
using Application.Website;

namespace Api.Tests;

public class SectionContentTests
{
    static JsonObject Obj(string json) => JsonNode.Parse(json)!.AsObject();
    static List<FieldSpec> Faq => Page.TypeOf("faq")!.FieldList;

    [Fact]
    public void Every_default_passes_the_same_check_as_an_admin_save_and_fills_every_field()
    {
        foreach (var t in Page.Types.Where(t => t.FieldList.Count > 0))
        {
            var d = Page.Defaults.GetValueOrDefault(t.Type);
            Assert.True(d is not null, $"{t.Type} has fields but no default content");
            var checkedContent = SectionContent.Check(t.FieldList, d!);
            Assert.Equal(d!.ToJsonString(), checkedContent.ToJsonString()); // already trimmed and in field order
        }
        Assert.All(Page.Defaults.Keys, k => Assert.True(Page.TypeOf(k) is not null, $"defaults.json has an unknown type {k}"));
    }

    [Fact]
    public void Check_puts_fields_in_order_and_trims()
    {
        var c = SectionContent.Check(Faq, Obj("""{"items":[{"a":" Yes ","q":"Q?"}],"heading":" FAQ "}"""));
        Assert.Equal("""{"heading":"FAQ","items":[{"q":"Q?","a":"Yes"}]}""", c.ToJsonString());
    }

    [Theory]
    [InlineData("""{"heading":"x","items":[],"extra":1}""", "isn't a field")]
    [InlineData("""{"heading":"x"}""", "missing")]
    [InlineData("""{"heading":"x","items":[]}""", "at least 1")]
    [InlineData("""{"heading":"x","items":[{"q":"","a":"a"}]}""", "can't be empty")]
    [InlineData("""{"heading":"one\ntwo","items":[{"q":"q","a":"a"}]}""", "one line")]
    [InlineData("""{"heading":5,"items":[{"q":"q","a":"a"}]}""", "must be text")]
    public void Check_rejects_bad_content(string json, string message)
    {
        var e = Assert.Throws<AppException>(() => SectionContent.Check(Faq, Obj(json)));
        Assert.Contains(message, e.Detail);
    }

    [Theory]
    [InlineData("https://rzp.io/x", true)]
    [InlineData("#pricing", true)]
    [InlineData("mailto:connect@ambot365.in", true)]
    [InlineData("tel:+91 88707 77365", true)]
    [InlineData("javascript:alert(1)", false)]
    [InlineData("http://example.com", false)]
    [InlineData("data:text/html,hi", false)]
    [InlineData("#Bad Anchor", false)]
    [InlineData("//evil.example", false)]
    [InlineData("/legal/privacy-policy.html", true)]
    [InlineData("/legal/../../x y", false)]
    public void Only_safe_links_get_through(string link, bool ok) => Assert.Equal(ok, SectionContent.SafeLink(link));

    [Fact]
    public void FillMissing_adds_new_fields_but_never_regrows_a_shortened_list()
    {
        var mine = Obj("""{"items":[{"q":"Only one","a":"a"}]}""");
        var filled = SectionContent.FillMissing(Faq, mine, Page.Defaults["faq"]);
        Assert.Equal(Page.Defaults["faq"]["heading"]!.ToString(), filled["heading"]!.ToString());
        Assert.Single(filled["items"]!.AsArray());
    }

    [Fact]
    public void Seed_fills_content_of_a_page_saved_before_the_section_had_fields()
    {
        var old = Page.Seed(null);
        old.Sections.First(s => s.Type == "faq").Content = [];
        var next = Page.Seed(old);
        Assert.Equal(Page.Defaults["faq"].ToJsonString(), next.Sections.First(s => s.Type == "faq").Content.ToJsonString());
        Assert.Equal(Page.Write(next), Page.Write(Page.Seed(next))); // stable: nothing changes on the next start
    }

    [Fact]
    public void Lost_shared_blocks_come_back_with_their_starting_content()
    {
        var d = Page.Seed(null);
        d.Shared.Clear(); // as an older API would save it; SeededTypes still lists them
        var next = Page.Seed(d);
        Assert.Equal(Page.Types.Where(t => t.Shared).Select(t => t.Type), next.Shared.Select(s => s.Type));
        Assert.Equal(Page.Defaults["labels"].ToJsonString(), next.Shared.First(s => s.Type == "labels").Content.ToJsonString());
        Assert.Equal(Page.Write(next), Page.Write(Page.Seed(next)));
    }

    [Fact]
    public void A_content_save_needs_the_sections_current_revision()
    {
        var d = Page.Seed(null);
        var content = Obj("""{"heading":"Questions","items":[{"q":"q","a":"a"}]}""");
        var next = Page.SetContent(d, "faq", 0, content);
        Assert.Equal(1, next.Sections.First(s => s.Id == "faq").Rev);
        Assert.Equal("Questions", next.Sections.First(s => s.Id == "faq").Content["heading"]!.ToString());
        Assert.Equal(409, Assert.Throws<AppException>(() => Page.SetContent(next, "faq", 0, content)).Status);
        Assert.Equal(0, d.Sections.First(s => s.Id == "faq").Rev); // the page passed in is untouched
    }

    [Fact]
    public void Repeatable_sections_can_be_added_duplicated_and_removed_and_only_the_first_gets_the_anchor()
    {
        var d = Page.Seed(null);
        d.Sections.First(s => s.Id == "faq").Visible = true;
        var (two, id) = Page.AddSection(d, "faq", "faq", copyOf: "faq");
        Assert.Equal("faq-2", id);
        Assert.Equal(two.Sections.FindIndex(s => s.Id == "faq") + 1, two.Sections.FindIndex(s => s.Id == "faq-2"));
        var shown = Page.Visible(two).Select(o => (Id: (string)o.GetType().GetProperty("Id")!.GetValue(o)!, Anchor: (string?)o.GetType().GetProperty("Anchor")!.GetValue(o))).ToList();
        Assert.Equal("#faq", shown.First(s => s.Id == "faq").Anchor);
        Assert.Null(shown.First(s => s.Id == "faq-2").Anchor);

        Assert.Throws<AppException>(() => Page.AddSection(d, "benefits", null, null)); // only one Benefits
        Assert.Throws<AppException>(() => Page.RemoveSection(d, "hero"));
        var without = Page.RemoveSection(two, "faq-2");
        Assert.DoesNotContain(without.Sections, s => s.Id == "faq-2");
        Assert.Equal("footer", Page.AddSection(without, "faq", null, null).Doc.Sections[^1].Type); // new ones land before the footer
    }
}
