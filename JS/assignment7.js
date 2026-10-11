'use strict';

const animals =
{

 snake: { image: 'snake.svg', habitat: 'habitat-snake.png', description: 'Glass terrarium with bark, a hide, branch, water dish and lamp.' },

 dog: { image: 'dog.svg', habitat: 'habitat-dog.png', description: 'Wooden kennel with an arched entrance in a grassy yard.' },

 bird: { image: 'bird.svg', habitat: 'habitat-bird.png', description: 'Metal cage with perches, a hanging swing and feeding cups.' },

 fish: { image: 'fish.svg', habitat: 'habitat-fish.png', description: 'Glass aquarium filled with water, gravel, aquatic plants and bubbles.' }

};

const tray = document.getElementById('animals');

const habitats = document.getElementById('habitats');

const status = document.getElementById('status');

const submit = document.getElementById('submit');

let selected = null, activeDrag = null, target = null, placed = null, verified = false;

function shuffled(ids)
{

    const result = [...ids];
    
    for (let i = result.length - 1; i > 0; i--)
    {

    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];

    }

    return result;

}

function say(message, type = '')
{

 status.textContent = message;
 
 status.className = 'status' + (type ? ' ' + type : '');

}

function selectAnimal(id)
{

 if (verified) return;

 selected = id;

 document.querySelectorAll('.animal').forEach(card => card.setAttribute('aria-pressed', String(card.dataset.animal === id)));

 say('Image selected. Place it in a habitat, then select Submit.');

}

function positionAnimal()
{

const slot = document.querySelector('.placed-animal:not(:empty)');

if (!slot) return;

    const bounds = slot.parentElement.querySelector('.zone').getBoundingClientRect();

    const halfWidth = slot.offsetWidth / 2, halfHeight = slot.offsetHeight / 2;

    const x = Math.max(halfWidth, Math.min(bounds.width - halfWidth, Number(slot.dataset.x) * bounds.width));

    const y = Math.max(halfHeight, Math.min(bounds.height - halfHeight, Number(slot.dataset.y) * bounds.height));

    slot.style.left = x + 'px'; slot.style.top = y + 'px';

}

function placeAnimal(id, frame, clientX, clientY)
{

    if (verified || !Object.hasOwn(animals, id)) return;
    
    const card = document.querySelector('[data-animal="' + id + '"]');
    
    if (!card) return;
    
    const previous = document.querySelector('.placed-animal .animal');
    
    if (previous && previous !== card) tray.appendChild(previous);
    
    const slot = frame.querySelector('.placed-animal');
    
    const zone = frame.querySelector('.zone');
    
    slot.appendChild(card);
    
    const bounds = zone.getBoundingClientRect();
    
    const x = Number.isFinite(clientX) ? clientX - bounds.left : bounds.width / 2;
    
    const y = Number.isFinite(clientY) ? clientY - bounds.top : bounds.height / 2;
    
    slot.dataset.x = String(bounds.width ? x / bounds.width : 0.5);
    
    slot.dataset.y = String(bounds.height ? y / bounds.height : 0.5);
    
    positionAnimal();
    
    placed = { animal: id, habitat: frame.dataset.habitat };
    
    selected = null;
    
    document.querySelectorAll('.animal').forEach(item => item.setAttribute('aria-pressed', 'false'));
    
    document.querySelectorAll('.zone').forEach(item => item.classList.remove('pending'));
    
    zone.classList.add('pending');
    
    submit.disabled = false;
    
    say('Image placed. Select Submit to confirm, or change your choice.');

}
function makeAnimal(id)
{

    const card = document.createElement('button');
    
    card.type = 'button'; card.className = 'animal'; card.draggable = true;
    
    card.dataset.animal = id;
    
    card.setAttribute('aria-pressed', 'false');
    
    card.setAttribute('aria-label', 'Select ' + id + ' image');
    
    const img = document.createElement('img');
    
    img.alt = 'Illustration of a ' + id; img.draggable = true;
    
    img.src = '../Assets/Images/' + animals[id].image;
    
    card.appendChild(img);
    
    card.addEventListener('click', event => { event.stopPropagation(); selectAnimal(id); });
    
    card.addEventListener('dragstart', event =>
    {

        if (verified) { event.preventDefault(); return; }

        activeDrag = id;

        event.dataTransfer.setData('text/plain', id);

        event.dataTransfer.effectAllowed = 'move';

    });

    card.addEventListener('dragend', () =>
    {

        activeDrag = null;

        document.querySelectorAll('.zone').forEach(zone => zone.classList.remove('over'));

    });

    return card;

}

function makeHabitat(id, index)
{

    const frame = document.createElement('div');
    
    frame.className = 'habitat-frame'; frame.dataset.habitat = id;
    
    const zone = document.createElement('div');
    
    zone.className = 'zone'; zone.tabIndex = 0;
    
    zone.setAttribute('role', 'button');
    
    zone.setAttribute('aria-label', 'Habitat ' + (index + 1) + '. Place the selected image here.');
    
    zone.setAttribute('aria-describedby', 'instructions habitat-description-' + index);
    
    const img = document.createElement('img');
    
    img.className = 'habitat-image'; img.draggable = false;
    
    img.id = 'habitat-description-' + index;
    
    img.src = '../Assets/Images/' + animals[id].habitat;
    
    img.alt = animals[id].description;
    
    zone.appendChild(img);
    
    const slot = document.createElement('div');
    
    slot.className = 'placed-animal'; slot.setAttribute('aria-label', 'Your selected answer');
    
    frame.append(zone, slot);
    
    frame.addEventListener('dragover', event =>
    {

    if (verified || !activeDrag) return;

    event.preventDefault(); event.dataTransfer.dropEffect = 'move'; zone.classList.add('over');

    });

    frame.addEventListener('dragleave', event =>
    {

    if (!frame.contains(event.relatedTarget)) zone.classList.remove('over');

    });

    frame.addEventListener('drop', event =>
    {

        event.preventDefault(); zone.classList.remove('over');

        const id = event.dataTransfer.getData('text/plain');

        if (activeDrag && id === activeDrag) placeAnimal(id, frame, event.clientX, event.clientY);

        activeDrag = null;

    });

    zone.addEventListener('click', event => placeAnimal(selected, frame, event.clientX, event.clientY));

    zone.addEventListener('keydown', event =>
    {

        if (event.key === 'Enter' || event.key === ' ')
        {

        event.preventDefault(); placeAnimal(selected, frame);

        }

    });

    return frame;

}

function resetPuzzle(message = 'Match an animal to its habitat, then select Submit.', type = '')
{

    const choices = Object.keys(animals).filter(id => id !== target);
    
    target = choices[Math.floor(Math.random() * choices.length)];
    
    const multipleAnimals = Math.random() < 0.5;
    
    selected = null; activeDrag = null; placed = null; verified = false;
    
    tray.replaceChildren(); habitats.replaceChildren(); submit.disabled = true;
    
    tray.classList.toggle('single-animal', !multipleAnimals);
    
    habitats.classList.toggle('multiple-habitats', !multipleAnimals);
    
    document.getElementById('roundPrompt').textContent = multipleAnimals
    
    ? 'Which animal belongs in this habitat?'
    
    : 'Which habitat belongs to this animal?';
    
    const animalIds = multipleAnimals ? shuffled(Object.keys(animals)) : [target];
    
    const habitatIds = multipleAnimals ? [target] : shuffled(Object.keys(animals));
    
    animalIds.forEach(id => tray.appendChild(makeAnimal(id)));
    
    habitatIds.forEach((id, index) => habitats.appendChild(makeHabitat(id, index)));

    say(message, type);

}

submit.addEventListener('click', () =>
{

    if (!placed || verified) return;

    if (placed.animal !== placed.habitat)
    {
    
        resetPuzzle('Incorrect. Try again with this new challenge.', 'error');
    
        tray.firstElementChild.focus(); return;

    }

    verified = true; submit.disabled = true;

    const zone = document.querySelector('.zone.pending');

    zone.classList.remove('pending'); zone.classList.add('success');

    document.querySelectorAll('.animal').forEach(card =>
    {

        card.disabled = true; card.draggable = false; card.querySelector('img').draggable = false;

    });

    say('Verification complete! Your image matches the habitat.', 'success');

    document.getElementById('reset').focus();

});

document.getElementById('reset').addEventListener('click', () => resetPuzzle());

window.addEventListener('resize', positionAnimal);

window.addEventListener('dragover', event => event.preventDefault());

window.addEventListener('drop', event => event.preventDefault());

resetPuzzle();