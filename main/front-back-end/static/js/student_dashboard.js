$(document).ready(function () {
    $(".flex-box,.flex-box1,.flex-box4").hide();
    $("#btnotp").click(function () {
        $(".flex-box1").show(100);
    });
    $("#btncnfrm").click(function () {
        $(".flex-box,.flex-box4").show()
    });
    $("#accordian label").click(function () {

        const content = $(this).next("input").next(".content");

        $(".content").not(content).slideUp();
        $("#accordian label").not(this).find(".arrow").removeClass("active");

        content.slideToggle();

        $(this).find(".arrow").toggleClass("active");

    });

});