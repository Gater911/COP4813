"use strict";

const savedData = sessionStorage.getItem("assignment3FormData");

const statusBox = document.getElementById("confirmation-status");

const details = document.getElementById("confirmation-details");

const emailForm = document.getElementById("confirmation-email-form");

if (!savedData)
{
    
    showStatus("No form information was found. Please return to Assignment 3 and complete the form first.");

}

else
{

    try
    {

        const data = JSON.parse(savedData);

        document.getElementById("confirm-name").textContent = data.firstname + " " + data.lastname;

        document.getElementById("confirm-address").textContent = data.address + ", " + data.city + ", " + data.state + " " + data.zip;

        document.getElementById("confirm-phone").textContent = data.phone;

        document.getElementById("confirm-email").textContent = data.email;

        document.getElementById("confirm-birthdate").textContent = formatDate(data.birthdate);

        document.getElementById("confirm-message").textContent = data.message;

        document.getElementById("email-firstname").value = data.firstname;

        document.getElementById("email-lastname").value = data.lastname;

        document.getElementById("email-address").value = data.address;

        document.getElementById("email-city").value = data.city;

        document.getElementById("email-state").value = data.state;

        document.getElementById("email-zip").value = data.zip;

        document.getElementById("email-phone").value = data.phone;

        document.getElementById("email-email").value = data.email;

        document.getElementById("email-birthdate").value = data.birthdate;

        document.getElementById("email-message").value = data.message;

        details.hidden = false;

        emailForm.hidden = false;

    }
    
    catch (error)
    {

        sessionStorage.removeItem("assignment3FormData");

        showStatus("The saved form information could not be read. Please return to the form and try again.");
    
    }

}

function formatDate(dateString)
{

    const parts = dateString.split("-");

    if (parts.length !== 3)
    {

        return dateString;

    }

    return parts[1] + "/" + parts[2] + "/" + parts[0];

}

function showStatus(message)
{

    statusBox.textContent = message;

    statusBox.hidden = false;

    statusBox.scrollIntoView({ behavior: "smooth", block: "center" });

}