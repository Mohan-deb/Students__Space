$(document).ready(function () {
    $(".flex-box,.flex-box1,.flex-box4").hide();
    $("#btnotp").click(function () {
        $(".flex-box1").show(100);
    });
    $("#btncnfrm").click(function () {
        $(".flex-box,.flex-box4").show()
    });
})