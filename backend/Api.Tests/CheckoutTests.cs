using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Api;

namespace Api.Tests;

public class CheckoutTests
{
    static readonly List<FieldDto> Form =
    [
        .. Checkout.DefaultForm(),
        new("f_city", "City", "select", true, null, ["Chennai", "Coimbatore"]),
        new("f_tools", "Tools you use", "checkbox", false, null, ["Excel", "Word", "Teams"]),
        new("f_years", "Years of experience", "number"),
        new("f_dob", "Date", "date"),
    ];

    static Dictionary<string, JsonElement> In(object o) =>
        JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(JsonSerializer.Serialize(o))!;

    [Fact]
    public void Good_answers_become_rows_and_fill_the_customer()
    {
        var r = Checkout.ReadAnswers(Form, In(new
        {
            name = " Priya K ", email = "Priya@Example.com", phone = "+91 98400 12345",
            f_city = "Chennai", f_tools = new[] { "Excel", "Teams" }, f_years = "3", unknown = "dropped",
        }));
        Assert.Null(r.Error);
        Assert.Equal("Priya K", r.Name);
        Assert.Equal("priya@example.com", r.Email);
        Assert.Equal("+91 98400 12345", r.Phone);
        Assert.Equal("Excel, Teams", r.Answers.Single(a => a.Key == "f_tools").Value);
        Assert.DoesNotContain(r.Answers, a => a.Key is "unknown" or "f_dob"); // unknown dropped, empty optional skipped
    }

    [Theory]
    [InlineData("email", "not-an-email", "Email")]
    [InlineData("phone", "12ab", "Phone")]
    [InlineData("f_city", "Madurai", "City")]
    [InlineData("f_years", "three", "Years")]
    [InlineData("f_dob", "28/11/2026", "Date")]
    public void Bad_answers_are_refused_with_the_field_named(string key, string value, string label)
    {
        var input = new Dictionary<string, object> { ["name"] = "A", ["email"] = "a@b.co", ["phone"] = "9840012345", ["f_city"] = "Chennai" };
        input[key] = value;
        var r = Checkout.ReadAnswers(Form, In(input));
        Assert.NotNull(r.Error);
        Assert.Contains(label, r.Error);
    }

    [Fact]
    public void Required_fields_must_be_filled()
    {
        Assert.Equal("Please fill in City.", Checkout.ReadAnswers(Form, In(new { name = "A", email = "a@b.co", phone = "9840012345" })).Error);
        Assert.Contains("Full name", Checkout.ReadAnswers(Form, null).Error);
    }

    [Fact]
    public void Form_rules_protect_the_built_in_fields_and_choices()
    {
        Assert.Null(Checkout.ValidateForm(Form));
        Assert.NotNull(Checkout.ValidateForm(Form.Where(f => f.Key != "email").ToList()));
        Assert.NotNull(Checkout.ValidateForm([.. Form.Where(f => f.Key != "name"), new("name", "Name", "text", Required: false)]));
        Assert.NotNull(Checkout.ValidateForm([.. Checkout.DefaultForm(), new("f_x", "Pick", "select", false, null, [])]));
        Assert.NotNull(Checkout.ValidateForm([.. Checkout.DefaultForm(), new("f_x", "Pick", "checkbox", false, null, ["A, B"])]));
        Assert.NotNull(Checkout.ValidateForm([.. Checkout.DefaultForm(), new("email", "Dup", "text")]));
        Assert.Null(Checkout.ValidateForm(Checkout.DefaultForm().Where(f => f.Key != "phone").ToList())); // phone is optional
    }

    [Fact]
    public void Checkout_signature_is_order_pipe_payment_with_the_key_secret()
    {
        var sig = Convert.ToHexString(HMACSHA256.HashData(Encoding.UTF8.GetBytes("ks"), Encoding.UTF8.GetBytes("order_1|pay_1"))).ToLowerInvariant();
        Assert.True(Checkout.SignatureValid("order_1", "pay_1", sig, "ks"));
        Assert.False(Checkout.SignatureValid("order_1", "pay_2", sig, "ks"));
        Assert.False(Checkout.SignatureValid("order_1", "pay_1", sig, "webhook-secret"));
        Assert.False(Checkout.SignatureValid("order_1", "pay_1", null, "ks"));
    }
}
