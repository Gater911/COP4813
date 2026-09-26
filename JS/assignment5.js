"use strict";

document.addEventListener("DOMContentLoaded", () =>
{

    const form = document.getElementById("spirograph-form");

    const canvas = document.getElementById("spirograph-canvas");

    const ctx = canvas.getContext("2d");

    const errorSummary = document.getElementById("assignment5-errors");

    const status = document.getElementById("drawing-status");

    const startButton = document.getElementById("start-spirograph");

    let animationFrameId = null;

    const limits =
    {

        outerRadius: { min: 20, max: 250 },

        innerRadius: { min: 5, max: 200 },

        penOffset: { min: 0, max: 200 }

    };

    function getNumber(id)
    {

        const value = document.getElementById(id).value.trim();

        return value === "" ? Number.NaN : Number(value);

    }

    function getValues()
    {

        return{

            R: getNumber("outer-radius"),

            r: getNumber("inner-radius"),

            O: getNumber("pen-offset")
            
        };

    }

    function validate(values)
    {

        const errors = [];

        if (!Number.isFinite(values.R) || !Number.isInteger(values.R) || values.R < limits.outerRadius.min || values.R > limits.outerRadius.max)
        {

            errors.push({field: "outer-radius", message: "Outer Radius (R) must be a whole number between 50 and 200."});

        }

        if (!Number.isFinite(values.r) || !Number.isInteger(values.r) || values.r < limits.innerRadius.min || values.r > limits.innerRadius.max)
        {

            errors.push({field: "inner-radius", message: "Inner Radius (r) must be a whole number between 5 and 150."});

        }

        if (!Number.isFinite(values.O) || !Number.isInteger(values.O) || values.O < limits.penOffset.min || values.O > limits.penOffset.max)
        {

            errors.push({field: "pen-offset", message: "Pen Offset (O) must be a whole number between 0 and 150."});

        }

        if(Number.isFinite(values.R) && Number.isFinite(values.r) && values.r > values.R)
        {

            errors.push({field: "inner-radius", message: "Inner Radius (r) cannot be greater than Outer Radius (R)."});

        }

        return errors;

    }

    function clearErrors()
    {

        errorSummary.hidden = true;

        errorSummary.innerHTML = "";

        form.querySelectorAll(".field-error").forEach((element) => 
        {

            element.textContent = "";

        });

        form.querySelectorAll("[aria-invalid='true']").forEach((field) =>
        {

            field.removeAttribute("aria-invalid");

        });

    }

    function showErrors(errors)
    {

        const heading = document.createElement("p");

        heading.className = "error-heading";

        heading.textContent = "Please correct the following:";

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

            const link = document.createElement("a");

            link.href = "#" + error.field;

            link.textContent = error.message;

            item.appendChild(link);

            list.appendChild(item);

        });

        errorSummary.replaceChildren(heading, list);

        errorSummary.hidden = false;

        const firstField = document.getElementById(errors[0].field);

        if (firstField)
        {

            firstField.focus();

        }

    }

    function clearCanvas()
    {

        ctx.clearRect(0, 0, canvas.width, canvas.height);

    }

    function greatestCommonDivisor(a, b)
    {

        a = Math.abs(Math.round(a));

        b = Math.abs(Math.round(b));

        while (b !== 0)
        {

            const remainder = a % b;

            a = b;

            b = remainder;

        }

        return a || 1;

    }

    function getPosition(t, values)
    {

        const ratio = (values.R + values.r) / values.r;

        return{

            x: (values.R + values.r) * Math.cos(t) - (values.r + values.O) * Math.cos(ratio * t),
            
            y: (values.R + values.r) * Math.sin(t) - (values.r + values.O) * Math.sin(ratio * t)

        };

    }

    function getScale(values)
    {

        const maximumRadius = values.R + (2 * values.r) + values.O;

        const canvasRadius = Math.min(canvas.width, canvas.height) * 0.44;

        return canvasRadius / maximumRadius;

    }

    function drawSpirograph(values)
    {

        if (animationFrameId !== null)
        {

            cancelAnimationFrame(animationFrameId);

        }

        clearCanvas();

        const centerX = canvas.width / 2;

        const centerY = canvas.height / 2;

        const scale = getScale(values);

        const divisor = greatestCommonDivisor(values.R, values.r);

        const completePeriod = 2 * Math.PI * (values.r / divisor);

        const tIncrement = 0.02;

        const segmentsPerFrame = 140;

        let t = 0;

        let previous = getPosition(t, values);

        ctx.lineWidth = 1.6;

        ctx.lineCap = "round";

        ctx.lineJoin = "round";

        ctx.strokeStyle = "#24584f";

        startButton.disabled = true;

        startButton.textContent = "Drawing...";

        status.textContent = "Drawing the Spirograph pattern...";

        function drawFrame()
        {

            ctx.beginPath();

            ctx.moveTo(centerX + previous.x * scale, centerY - previous.y * scale);

            let segmentsDrawn = 0;

            while (segmentsDrawn < segmentsPerFrame && t < completePeriod)
            {

                t = Math.min(t + tIncrement, completePeriod);

                const current = getPosition(t, values);

                ctx.lineTo(centerX + current.x * scale, centerY - current.y * scale);

                previous = current;
                
                segmentsDrawn += 1;

            }

            ctx.stroke();

            if (t < completePeriod)
            {

                animationFrameId = requestAnimationFrame(drawFrame);

            }
            
            else
            {
                animationFrameId = null;

                startButton.disabled = false;

                startButton.textContent = "Start Spirograph";

                status.textContent = `Drawing complete using R = ${values.R}, r = ${values.r}, and O = ${values.O}.`;

            }

        }

        animationFrameId = requestAnimationFrame(drawFrame);

    }

    form.addEventListener("submit", (event) =>
    {

        event.preventDefault();

        clearErrors();

        const values = getValues();

        const errors = validate(values);

        if (errors.length > 0)
        {

            status.textContent = "The Spirograph was not started because some values need to be corrected.";

            showErrors(errors);

            return;

        }

        drawSpirograph(values);

    });

    form.querySelectorAll("input").forEach((input) =>
    {

        input.addEventListener("input", () =>
        {

            input.removeAttribute("aria-invalid");

            const fieldError = document.getElementById(input.id + "-error");

            if (fieldError)
            {

                fieldError.textContent = "";

            }

        });

    });

    clearCanvas();

});