using Application.Common;
using Application.Website;

namespace Api.Tests;

public class PageTests
{
    static List<string> Ids(PageDoc d) => d.Sections.Select(s => s.Id).ToList();
    static List<Page.LayoutItem> Layout(PageDoc d) => d.Sections.Select(s => new Page.LayoutItem(s.Id, s.Visible)).ToList();

    [Fact]
    public void Fresh_page_has_every_type_in_order_navbar_first_footer_last()
    {
        var d = Page.Seed(null);
        Assert.Equal(Page.Types.Select(t => t.Type), Ids(d));
        Assert.Equal(Page.Types.Select(t => t.DefaultVisible), d.Sections.Select(s => s.Visible));
    }

    [Fact]
    public void A_new_type_is_added_once_and_a_removed_section_stays_removed()
    {
        var d = Page.Seed(null);
        d.Sections.RemoveAll(s => s.Type == "faq"); // as if an admin had deleted it
        d.SeededTypes.Remove("agenda"); // as if agenda were new in this release
        d.Sections.RemoveAll(s => s.Type == "agenda");

        var next = Page.Seed(d);
        Assert.DoesNotContain("faq", Ids(next));
        Assert.Equal(Ids(next).IndexOf("seat-scroll") + 1, Ids(next).IndexOf("agenda")); // back at its place
        Assert.Equal(Ids(next), Ids(Page.Seed(next))); // nothing more on the next start
    }

    [Fact]
    public void A_type_added_later_lands_before_the_footer_even_after_reordering()
    {
        var d = Page.Seed(null);
        d.SeededTypes.Remove("final-cta");
        d.Sections.RemoveAll(s => s.Type == "final-cta");
        var next = Page.Seed(d);
        Assert.Equal("footer", Ids(next)[^1]);
        Assert.Equal("final-cta", Ids(next)[^2]);
    }

    [Fact]
    public void SetLayout_reorders_and_hides_without_touching_the_original()
    {
        var d = Page.Seed(null);
        var layout = Layout(d);
        (layout[2], layout[3]) = (layout[3], layout[2] with { Visible = false });
        var next = Page.SetLayout(d, layout);
        Assert.Equal(layout.Select(l => l.Id), Ids(next));
        Assert.False(next.Sections[3].Visible);
        Assert.Equal(Page.Types.Select(t => t.Type), Ids(d)); // the draft passed in is unchanged
    }

    [Fact]
    public void SetLayout_keeps_the_rules()
    {
        var d = Page.Seed(null);
        var hideHero = Layout(d).Select(l => l.Id == "hero" ? l with { Visible = false } : l).ToList();
        Assert.Throws<AppException>(() => Page.SetLayout(d, hideHero));

        var footerFirst = Layout(d);
        (footerFirst[1], footerFirst[^1]) = (footerFirst[^1], footerFirst[1]);
        Assert.Throws<AppException>(() => Page.SetLayout(d, footerFirst));

        Assert.Throws<AppException>(() => Page.SetLayout(d, Layout(d).Skip(1).ToList())); // a section missing
        Assert.Throws<AppException>(() => Page.SetLayout(d, [.. Layout(d).SkipLast(1), new("nope", true)]));
    }

    [Fact]
    public void Website_gets_only_visible_sections_in_order()
    {
        var d = Page.Seed(null);
        var shown = Page.Visible(d).Select(o => (string)o.GetType().GetProperty("Type")!.GetValue(o)!).ToList();
        Assert.Equal(Page.Types.Where(t => t.DefaultVisible).Select(t => t.Type), shown);
    }

    [Fact]
    public void Page_round_trips_through_json()
    {
        var d = Page.Seed(null);
        d.Sections[1].Content["title"] = "Hello";
        var back = Page.Read(Page.Write(d));
        Assert.Equal("Hello", (string?)back.Sections[1].Content["title"]);
        Assert.Equal(Page.Write(d), Page.Write(back));
    }
}
