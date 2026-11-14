"use strict";

document.addEventListener('DOMContentLoaded', function ()
{
    const dataFile = '../JSON/cms_systems.json';
    const tableBody = document.getElementById('cms-table-body');
    const status = document.getElementById('cms-status');
    const search = document.getElementById('cms-search');

    let systems = [];

    function createList(items)
    {
        const list = document.createElement('ul');
        list.className = 'cms-list';

        items.forEach(function (item)
        {
            const listItem = document.createElement('li');
            listItem.textContent = item;
            list.appendChild(listItem);
        });

        return list;
    }

    function appendSources(cell, sources)
    {
        if (!sources || !sources.length)
        {
            return;
        }

        const sourceBox = document.createElement('div');
        sourceBox.className = 'cell-sources';

        sources.forEach(function (source, index)
        {
            const link = document.createElement('a');
            link.href = source.url;
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = source.label;

            sourceBox.appendChild(link);

            if (index < sources.length - 1)
            {
                sourceBox.appendChild(document.createTextNode(' • '));
            }
        });

        cell.appendChild(sourceBox);
    }

    function createTextCell(items, sources)
    {
        const cell = document.createElement('td');
        cell.appendChild(createList(items));
        appendSources(cell, sources);
        return cell;
    }

    function createExampleCell(system)
    {
        const cell = document.createElement('td');

        const siteLink = document.createElement('a');
        siteLink.className = 'example-site';
        siteLink.href = system.example.url;
        siteLink.target = '_blank';
        siteLink.rel = 'noopener';
        siteLink.textContent = system.example.name;

        cell.appendChild(siteLink);
        appendSources(cell, system.sources.example);

        return cell;
    }

    function renderTable(filterText)
    {
        tableBody.innerHTML = '';

        const filter = filterText.trim().toLowerCase();

        const filtered = systems.filter(function (system)
        {
            if (!filter)
            {
                return true;
            }

            const searchable = [
                system.system,
                system.support.join(' '),
                system.technology.join(' '),
                system.capabilities.join(' '),
                system.limitations.join(' '),
                system.example.name
            ].join(' ').toLowerCase();

            return searchable.includes(filter);
        });

        if (!filtered.length)
        {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 6;
            cell.className = 'no-results';
            cell.textContent = 'No CMS entries match the current filter.';
            row.appendChild(cell);
            tableBody.appendChild(row);
            return;
        }

        filtered.forEach(function (system)
        {
            const row = document.createElement('tr');

            const systemCell = document.createElement('th');
            systemCell.scope = 'row';
            systemCell.className = 'system-name';
            systemCell.textContent = system.system;

            row.appendChild(systemCell);
            row.appendChild(createTextCell(system.support, system.sources.support));
            row.appendChild(createTextCell(system.technology, system.sources.technology));
            row.appendChild(createTextCell(system.capabilities, system.sources.capabilities));
            row.appendChild(createTextCell(system.limitations, system.sources.limitations));
            row.appendChild(createExampleCell(system));

            tableBody.appendChild(row);
        });
    }

    async function loadData()
    {
        try
        {
            const response = await fetch(dataFile, { cache: 'no-store' });

            if (!response.ok)
            {
                throw new Error('HTTP status ' + response.status);
            }

            const data = await response.json();
            systems = data.systems;

            renderTable('');
            search.disabled = false;

            search.addEventListener('input', function ()
            {
                renderTable(search.value);
            });

            status.textContent =
                systems.length + ' CMS platforms loaded from the external JSON file.';
        }
        catch (error)
        {
            console.error(error);

            tableBody.innerHTML =
                '<tr><td colspan="6">The CMS JSON file could not be loaded. View this page through GitHub Pages or another web server rather than opening the HTML file directly.</td></tr>';

            status.textContent = 'CMS data is unavailable.';
        }
    }

    loadData();
});
