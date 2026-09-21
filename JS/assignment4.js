"use strict";

document.addEventListener("DOMContentLoaded", () =>
{

    const form = document.getElementById("assignment4-form");
    
    const errorSummary = document.getElementById("assignment4-errors");
    
    const resetButton = document.getElementById("reset-example");
    
    const resultSummary = document.getElementById("result-summary");
    
    const chartStatus = document.getElementById("chart-status");
    
    const tableBody = document.getElementById("calculated-values");
    
    const chartCanvas = document.getElementById("oscillation-chart");

    let oscillationChart = null;

    const exampleValues =
    {

        amplitude: 7,
        
        damping: 0.32,
        
        frequency: 4,
        
        xMin: 0,
        
        xMax: 12,
        
        xStep: 0.3

    };

    function calculateY(x, amplitude, damping, frequency)
    {
        
        return amplitude * Math.exp(-damping * x) * Math.cos(frequency * x);

    }

    function getNumber(id)
    {

        const rawValue = document.getElementById(id).value.trim();
        
        return rawValue === "" ? Number.NaN : Number(rawValue);

    }

    function getValues()
    {

        return{

            amplitude: getNumber("amplitude"),
            
            damping: getNumber("damping"),
            
            frequency: getNumber("frequency"),
            
            xMin: getNumber("x-min"),
            
            xMax: getNumber("x-max"),
            
            xStep: getNumber("x-step")

        };

    }

    function validate(values)
    {

        const errors = [];

        if (!Number.isFinite(values.amplitude))
        {

            errors.push({ field: "amplitude", message: "Enter a valid amplitude." });

        }

        if (!Number.isFinite(values.damping) || values.damping < 0)
        {

            errors.push({ field: "damping", message: "Enter a damping coefficient of 0 or greater." });

        }

        if (!Number.isFinite(values.frequency) || values.frequency <= 0)
        {

            errors.push({ field: "frequency", message: "Enter an angular frequency greater than 0." });

        }

        if (!Number.isFinite(values.xMin))
        {

            errors.push({ field: "x-min", message: "Enter a valid minimum x-value." });

        }

        if (!Number.isFinite(values.xMax))
        {

            errors.push({ field: "x-max", message: "Enter a valid maximum x-value." });

        }

        if (Number.isFinite(values.xMin) && Number.isFinite(values.xMax) && values.xMax <= values.xMin)
        {

            errors.push({ field: "x-max", message: "Maximum x must be greater than minimum x." });

        }

        if (!Number.isFinite(values.xStep) || values.xStep <= 0)
        {

            errors.push({ field: "x-step", message: "Enter an x step greater than 0." });

        }

        if
        (
            Number.isFinite(values.xMin) &&
            Number.isFinite(values.xMax) &&
            Number.isFinite(values.xStep) &&
            values.xMax > values.xMin &&
            values.xStep > 0
        ) {

            const estimatedPoints = Math.floor((values.xMax - values.xMin) / values.xStep) + 1;
            
            if (estimatedPoints > 501)
            {

                errors.push(
                {

                    field: "x-step",

                    message: "Choose a larger x step so the calculation uses 501 points or fewer."

                });
                
            }

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

            const fieldError = document.getElementById(`${error.field}-error`);

            if (field)
            {

                field.setAttribute("aria-invalid", "true");

            }

            if (fieldError)
            {

                fieldError.textContent = error.message;

            }

            const listItem = document.createElement("li");
            
            const link = document.createElement("a");
            
            link.href = `#${error.field}`;
            
            link.textContent = error.message;
            
            link.addEventListener("click", () =>
            {

                window.setTimeout(() => field?.focus(), 0);

            });

            listItem.appendChild(link);
            
            list.appendChild(listItem);

        });

        errorSummary.append(heading, list);

        errorSummary.hidden = false;

        const firstField = document.getElementById(errors[0].field);

        firstField?.focus();

    }

    function buildData(values)
    {

        const points = [];
        
        const span = values.xMax - values.xMin;
        
        const pointCount = Math.floor(span / values.xStep) + 1;

        for (let index = 0; index < pointCount; index += 1)
        {

            const x = values.xMin + (index * values.xStep);

            const y = calculateY(x, values.amplitude, values.damping, values.frequency);

            points.push({ x, y });

        }

        const lastPoint = points[points.length - 1];

        if (lastPoint && lastPoint.x < values.xMax - 1e-10 && points.length < 501)
        {

            const x = values.xMax;

            points.push(
            {

                x,

                y: calculateY(x, values.amplitude, values.damping, values.frequency)

            });

        }

        return points;

    }

    function displayNumber(value)
    {

        if (Math.abs(value) < 1e-12)
        {

            return "0";

        }

        return Number(value.toFixed(6)).toString();

    }

    function updateTable(points)
    {

        const fragment = document.createDocumentFragment();

        tableBody.innerHTML = "";

        points.forEach((point) =>
        {

            const row = document.createElement("tr");
            
            const xCell = document.createElement("td");
            
            const yCell = document.createElement("td");

            xCell.textContent = displayNumber(point.x);
            
            yCell.textContent = displayNumber(point.y);

            row.append(xCell, yCell);
            
            fragment.appendChild(row);

        });

        tableBody.appendChild(fragment);

    }

    function updateSummary(points, values)
    {

        const yValues = points.map((point) => point.y);
        
        const minimumY = Math.min(...yValues);
        
        const maximumY = Math.max(...yValues);

        resultSummary.textContent =
            `${points.length} points calculated from x = ${displayNumber(values.xMin)} to ` +
            `${displayNumber(values.xMax)}. y ranges from ${displayNumber(minimumY)} to ` +
            `${displayNumber(maximumY)}.`;

    }

    function updateChart(points)
    {

        if (typeof Chart === "undefined")
        {

            chartStatus.textContent = "The plotting library could not be loaded. The calculated values are still shown in the table below.";

            return;

        }

        chartStatus.textContent = "";

        if (oscillationChart)
        {

            oscillationChart.destroy();

        }

        oscillationChart = new Chart(chartCanvas,
        {

            type: "line",

            data:
            {

                datasets: [
                {
                    label: "y = A e^(-bx) cos(ωx)",
                    
                    data: points,
                    
                    parsing: false,
                    
                    borderColor: "#24584f",
                    
                    backgroundColor: "rgba(36, 88, 79, 0.12)",
                    
                    borderWidth: 2,
                    
                    pointRadius: 0,
                    
                    pointHoverRadius: 4,
                    
                    tension: 0.08,
                    
                    fill: false

                }]

            },

            options:
            {

                responsive: true,
                
                maintainAspectRatio: false,
                
                interaction:
                {

                    intersect: false,

                    mode: "nearest"

                },

                plugins:
                {

                    title:
                    {

                        display: true,

                        text: "Damped Oscillation"

                    },

                    tooltip:
                    {

                        callbacks:
                        {

                            label(context)
                            {

                                return `x: ${displayNumber(context.parsed.x)}, y: ${displayNumber(context.parsed.y)}`;

                            }

                        }

                    }

                },

                scales:
                {

                    x:
                    {

                        type: "linear",
                        
                        title:
                        {

                            display: true,
                            
                            text: "x (Independent Variable)"

                        }

                    },

                    y:
                    {

                        title:
                        {

                            display: true,
                            
                            text: "y (Dependent Variable)"

                        }

                    }

                }

            }

        });

    }

    function calculateAndDisplay()
    {

        clearErrors();

        const values = getValues();

        const errors = validate(values);

        if (errors.length > 0)
        {

            showErrors(errors);

            return;

        }

        const points = buildData(values);
        
        updateSummary(points, values);
        
        updateChart(points);
        
        updateTable(points);
    
    }

    function setExampleValues()
    {

        document.getElementById("amplitude").value = exampleValues.amplitude;
        
        document.getElementById("damping").value = exampleValues.damping;
        
        document.getElementById("frequency").value = exampleValues.frequency;
        
        document.getElementById("x-min").value = exampleValues.xMin;
        
        document.getElementById("x-max").value = exampleValues.xMax;
        
        document.getElementById("x-step").value = exampleValues.xStep;
    
    }

    form.addEventListener("submit", (event) =>
    {

        event.preventDefault();

        calculateAndDisplay();

    });

    resetButton.addEventListener("click", () =>
    {

        setExampleValues();

        calculateAndDisplay();

    });

    form.querySelectorAll("input").forEach((input) =>
    {

        input.addEventListener("input", () =>
        {

            input.removeAttribute("aria-invalid");

            const fieldError = document.getElementById(`${input.id}-error`);

            if (fieldError)
            {

                fieldError.textContent = "";

            }

        });

    });

    calculateAndDisplay();
    
});