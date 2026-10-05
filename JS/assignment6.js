"use strict";

document.addEventListener("DOMContentLoaded", () =>
{

    const jsonFile = "../JSON/reptiles.json";

    const tableBody = document.getElementById("reptile-table-body");
    
    const statusMessage = document.getElementById("json-status");
    
    const collectionDetails = document.getElementById("collection-details");
    
    const statusFilter = document.getElementById("status-filter");
    
    const summary = document.getElementById("data-summary");

    const totalCount = document.getElementById("total-count");
    
    const saleCount = document.getElementById("sale-count");
    
    const holdbackCount = document.getElementById("holdback-count");

    let allReptiles = [];

    function formatDate(dateString)
    {

        const date = new Date(dateString + "T00:00:00");

        if (Number.isNaN(date.getTime()))
        {

            return dateString;

        }

        return new Intl.DateTimeFormat("en-US",
        {

            year: "numeric",
            
            month: "long",
            
            day: "numeric"

        }).format(date);

    }

    function updateSummary(reptiles)
    {

        totalCount.textContent = reptiles.length;

        saleCount.textContent = reptiles.filter((reptile) => reptile.status === "For Sale").length;
        
        holdbackCount.textContent = reptiles.filter((reptile) => reptile.status === "Holdback").length;

        summary.hidden = false;

    }

    function createCell(value)
    {

        const cell = document.createElement("td");

        cell.textContent = value;
        
        return cell;

    }

    function displayReptiles(reptiles)
    {

        tableBody.innerHTML = "";

        if (reptiles.length === 0)
        {

            const row = document.createElement("tr");
            
            const cell = document.createElement("td");

            cell.colSpan = 7;
            
            cell.textContent = "No records match the selected status.";

            row.appendChild(cell);
            
            tableBody.appendChild(row);
            
            return;
        
        }

        const fragment = document.createDocumentFragment();

        reptiles.forEach((reptile) =>
        {

            const row = document.createElement("tr");

            row.appendChild(createCell(reptile.id));
            
            row.appendChild(createCell(reptile.name));
            
            row.appendChild(createCell(reptile.species));
            
            row.appendChild(createCell(reptile.morph));
            
            row.appendChild(createCell(reptile.sex));
            
            row.appendChild(createCell(reptile.hatchYear));
            
            row.appendChild(createCell(reptile.status));

            fragment.appendChild(row);
        
        });

        tableBody.appendChild(fragment);

    }

    function buildStatusFilter(reptiles)
    {

        const statuses = [...new Set(reptiles.map((reptile) => reptile.status))].sort((a, b) => a.localeCompare(b));

        statuses.forEach((status) =>
        {

            const option = document.createElement("option");
            
            option.value = status;
            
            option.textContent = status;
            
            statusFilter.appendChild(option);
        
        });

        statusFilter.disabled = false;

    }

    function validateData(data)
    {

        if (!data || typeof data !== "object")
        {

            throw new Error("The JSON file does not contain a valid data object.");

        }

        if (!Array.isArray(data.reptiles))
        {

            throw new Error('The JSON file must contain a "reptiles" array.');
        
        }

        return data;

    }

    async function loadJsonData()
    {

        try
        {

            const response = await fetch(jsonFile, { cache: "no-store" });

            if (!response.ok)
            {

                throw new Error(`Unable to load the JSON file. HTTP status: ${response.status}`);
            
            }

            const jsonText = await response.text();

            const data = validateData(JSON.parse(jsonText));

            allReptiles = data.reptiles;

            collectionDetails.textContent = `${data.collectionName}`;

            buildStatusFilter(allReptiles);
            
            displayReptiles(allReptiles);
            
            updateSummary(allReptiles);

            statusMessage.textContent = `${allReptiles.length} JSON records were loaded and parsed successfully.`;

            statusMessage.classList.add("json-status-success");

        } 
        
        catch (error)
        {

            console.error(error);

            tableBody.innerHTML = "";
            
            const row = document.createElement("tr");
            
            const cell = document.createElement("td");
            
            cell.colSpan = 7;
            
            cell.textContent = "The JSON data could not be displayed.";
            
            row.appendChild(cell);
            
            tableBody.appendChild(row);

            collectionDetails.textContent = "JSON data is unavailable.";
            
            statusMessage.textContent = "The external JSON file could not be loaded. If you opened the HTML file directly from your computer, view it through GitHub Pages or another web server instead.";
            
            statusMessage.classList.add("json-status-error");

        }

    }

    statusFilter.addEventListener("change", () =>
    {

        const selectedStatus = statusFilter.value;

        const filteredReptiles = selectedStatus === "All" ? allReptiles : allReptiles.filter((reptile) => reptile.status === selectedStatus);

        displayReptiles(filteredReptiles);

        statusMessage.textContent = selectedStatus === "All" ? `Showing all ${allReptiles.length} records.` : `Showing ${filteredReptiles.length} record(s) with status "${selectedStatus}".`;
    
    });

    loadJsonData();

});