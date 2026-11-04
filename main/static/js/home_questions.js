document.addEventListener("DOMContentLoaded", function () {

    const accordion = document.getElementById("accordian");

    const questions = accordion.querySelectorAll(
        'input[name="faq"]'
    );

    questions.forEach(function (question) {

        question.addEventListener("change", function () {

            questions.forEach(function (otherQuestion) {

                if (otherQuestion !== question) {
                    otherQuestion.checked = false;
                }

            });

        });

    });

});