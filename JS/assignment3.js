"use strict";

const form = document.getElementById("assignment3-form");

if (form)
{

    const phoneInput = document.getElementById("phone");
    
    const birthdateInput = document.getElementById("birthdate");
    
    const captchaInput = document.getElementById("captcha-answer");
    
    const captchaCodeDisplay = document.getElementById("captcha-code");
    
    const refreshCaptchaButton = document.getElementById("refresh-captcha");
    
    const errorSummary = document.getElementById("form-errors");

    let captchaCode = "";

    const today = new Date();

    const todayString = 
    [
        today.getFullYear(),

        String(today.getMonth() + 1).padStart(2, "0"),

        String(today.getDate()).padStart(2, "0")

    ].join("-");

    birthdateInput.max = todayString;

    birthdateInput.min = "1900-01-01";

    restoreSavedData();

    generateCaptcha();

    phoneInput.addEventListener("input", () =>
    {

        const digits = phoneInput.value.replace(/\D/g, "").slice(0, 10);

        let formatted = "";

        if (digits.length > 0)
        {

            formatted = "(" + digits.slice(0, 3);

        }

        if (digits.length >= 3)
        {

            formatted += ")" + digits.slice(3, 6);

        }

        if (digits.length >= 6)
        {

            formatted += "-" + digits.slice(6, 10);

        }

        phoneInput.value = formatted;

    });

    refreshCaptchaButton.addEventListener("click", () =>
    {

        generateCaptcha();

        captchaInput.value = "";

        captchaInput.focus();

        clearFieldError("captcha-answer");

    });

    form.addEventListener("reset", () =>
    {

        window.setTimeout(() =>
        {

            clearErrors();

            sessionStorage.removeItem("assignment3FormData");

            generateCaptcha();

        }, 0);

    });

    form.addEventListener("submit", (event) =>
    {

        event.preventDefault();

        clearErrors();

        const data = Object.fromEntries(new FormData(form).entries());

        const errors = validateForm(data);

        if (errors.length > 0)
        {

            showErrors(errors);

            if (errors.some((error) => error.field === "captcha-answer"))
            {
                generateCaptcha();

                captchaInput.value = "";

            }

            return;

        }

        const savedData = { ...data };

        delete savedData.captcha;

        sessionStorage.setItem("assignment3FormData", JSON.stringify(savedData));

        window.location.href = "assignment3_confirmation.html";

    });

    function restoreSavedData()
    {

        const savedData = sessionStorage.getItem("assignment3FormData");

        if (!savedData)
        {

            return;

        }

        try
        {

            const values = JSON.parse(savedData);

            Object.entries(values).forEach(([name, value]) =>
            {

                const field = form.elements.namedItem(name);

                if (field && name !== "captcha")
                {

                    field.value = value;

                }

            });

        }

        catch (error)
        {

            sessionStorage.removeItem("assignment3FormData");

        }

    }

    function generateCaptcha()
    {

        const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

        let newCode = "";

        for (let index = 0; index < 5; index += 1)
        {

            const randomIndex = Math.floor(Math.random() * characters.length);

            newCode += characters.charAt(randomIndex);

        }

        captchaCode = newCode;

        captchaCodeDisplay.textContent = captchaCode;

    }

    function validateForm(data)
    {

        const errors = [];

        const namePattern = /^[A-Za-z][A-Za-z' .-]*$/;

        const cityPattern = /^[A-Za-z][A-Za-z' .-]*$/;

        const streetPattern = /^\s*\d+[A-Za-z]?\s+.+/;

        const zipPattern = /^\d{5}(-\d{4})?$/;

        const phonePattern = /^\(\d{3}\)\d{3}-\d{4}$/;

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

        if (!data.firstname.trim() || !namePattern.test(data.firstname.trim()))
        {

            errors.push({ field: "first-name", message: "Enter a valid first name." });

        }

        if (!data.lastname.trim() || !namePattern.test(data.lastname.trim()))
        {

            errors.push({ field: "last-name", message: "Enter a valid last name." });

        }

        if (!streetPattern.test(data.address.trim()))
        {

            errors.push({ field: "address", message: "Enter a valid street address containing a street number and name." });

        }

        if (!data.city.trim() || !cityPattern.test(data.city.trim()))
        {

            errors.push({ field: "city", message: "Enter a valid city name." });

        }

        if (!data.state)
        {

            errors.push({ field: "state", message: "Select a state." });

        }

        if (!zipPattern.test(data.zip.trim()))
        {

            errors.push({ field: "zip", message: "Enter a valid 5-digit ZIP code or ZIP+4." });

        }

        if (!phonePattern.test(data.phone.trim()))
        {

            errors.push({ field: "phone", message: "Enter a complete 10-digit phone number in the format (000)000-0000." });

        }

        if (!emailPattern.test(data.email.trim()))
        {

            errors.push({ field: "email", message: "Enter a valid email address in the format name@domain.extension." });

        }

        if (!data.birthdate)
        {

            errors.push({ field: "birthdate", message: "Enter your birth date." });

        }
        
        else
        {
            const birthDate = new Date(data.birthdate + "T00:00:00");

            const earliestDate = new Date("1900-01-01T00:00:00");

            const currentDate = new Date(todayString + "T23:59:59");

            if (Number.isNaN(birthDate.getTime()) || birthDate < earliestDate || birthDate > currentDate)
            {

                errors.push({ field: "birthdate", message: "Enter a reasonable birth date between January 1, 1900 and today." });

            }

        }

        if (!data.message.trim())
        {

            errors.push({ field: "message", message: "Enter a message." });

        }

        if (!data.captcha || data.captcha.trim().toUpperCase() !== captchaCode)
        {

            errors.push({ field: "captcha-answer", message: "Enter the CAPTCHA code exactly as shown." });

        }

        return errors;

    }

    function clearErrors()
    {

        errorSummary.hidden = true;

        errorSummary.innerHTML = "";

        document.querySelectorAll(".field-error").forEach((element) =>
        {

            element.textContent = "";

        });

        form.querySelectorAll("[aria-invalid='true']").forEach((field) =>
        {

            field.removeAttribute("aria-invalid");

        });

    }

    function clearFieldError(fieldId)
    {

        const field = document.getElementById(fieldId);

        const fieldError = document.getElementById(fieldId + "-error");

        if (field)
        {

            field.removeAttribute("aria-invalid");

        }

        if (fieldError)
        {

            fieldError.textContent = "";

        }

    }

    function showErrors(errors)
    {

        const list = document.createElement("ul");

        errors.forEach((error) =>
        {

            const field = document.getElementById(error.field);

            const fieldError = document.getElementById(error.field + "-error");

            if (field)
            {

                field.setAttribute("aria-invalid", "true");

            }

            if (fieldError)
            {

                fieldError.textContent = error.message;

            }

            const item = document.createElement("li");
            
            item.textContent = error.message;
            
            list.appendChild(item);

        });

        const heading = document.createElement("p");
        
        heading.className = "error-heading";
        
        heading.textContent = "Please correct the following before continuing:";
        
        errorSummary.appendChild(heading);
        
        errorSummary.appendChild(list);
        
        errorSummary.hidden = false;
        
        errorSummary.scrollIntoView({ behavior: "smooth", block: "center" });

        const firstField = document.getElementById(errors[0].field);

        if (firstField)
        {

            firstField.focus({ preventScroll: true });

        }

    }

}