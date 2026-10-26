'use strict';

const canvas = document.getElementById('animation-canvas');

const ctx = canvas.getContext('2d');

const pause = document.getElementById('pause');

const reset = document.getElementById('reset');

const status = document.getElementById('animation-status');

const clickCount = document.getElementById('click-count');

const bounceCount = document.getElementById('bounce-count');

const floorY = canvas.height - 28;

const ball =
{

 x: 150,

 y: 300,

 radius: 48,

 dx: 3.2,

 dy: 2.4,

 color: '#24584f',

 rotation: 0,

 grounded: false,

 hurtUntil: 0,

 trapped: false,

 fear: 0,

 jumpPeakY: 300,

 impactUntil: 0,

 impactStrength: 0,

 hasBeenClicked: false

};

const mouse =
{

 x: canvas.width / 2,

 y: canvas.height / 2,

 active: false

};

const colors =
[

 '#24584f',

 '#b35300',

 '#315c9b',

 '#6f4a8e',

 '#2d7a46',

 '#a04f75',

 '#8a5317',

 '#8a1717'

];

const particles = [];

const shockwaves = [];

let timer = null, running = false, clicks = 0, bounces = 0;

const gravity = .42;

const maximumRollSpeed = 7;

const minimumRollSpeed = 1.2;

const reactionDistance = 300;

const trappedDistance = 185;

const hardImpactHeight = 155;

function drawBackground()
{

    ctx.fillStyle = '#ffffff';

    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#153f38';

    ctx.lineWidth = 4;

    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    ctx.beginPath();

    ctx.moveTo(4, floorY);

    ctx.lineTo(canvas.width - 4, floorY);

    ctx.strokeStyle = '#c8d5d2';

    ctx.lineWidth = 3;

    ctx.stroke();

}

function pupilOffset()
{

    if (!mouse.active)
    {

        return { x: 0, y: 0 };

    }

    const differenceX = mouse.x - ball.x;

    const differenceY = mouse.y - ball.y;

    const distance = Math.hypot(differenceX, differenceY) || 1;

    const maximumOffset = 4;

    return {

        x: differenceX / distance * maximumOffset,

        y: differenceY / distance * maximumOffset

    };

}

function faceState()
{

    if (Date.now() < ball.hurtUntil)
    {

        return 'hurt';

    }

    if (!ball.grounded)
    {

        return 'scared';

    }

    if (ball.trapped)
    {

        return 'terrified';

    }

    if (ball.fear > .55)
    {

        return 'scared';

    }

    if (ball.fear > .18)
    {

        return 'worried';

    }

    return 'normal';

}

function drawEyes(width, height, pupilRadius)
{

    const eyes = pupilOffset();

    ctx.fillStyle = '#ffffff';

    ctx.strokeStyle = '#153f38';

    ctx.lineWidth = 3;

    ctx.beginPath();

    ctx.ellipse(ball.x - 17, ball.y - 13, width, height, 0, 0, Math.PI * 2);

    ctx.fill();

    ctx.stroke();

    ctx.beginPath();

    ctx.ellipse(ball.x + 17, ball.y - 13, width, height, 0, 0, Math.PI * 2);

    ctx.fill();

    ctx.stroke();

    ctx.fillStyle = '#153f38';

    ctx.beginPath();

    ctx.arc(ball.x - 17 + eyes.x, ball.y - 13 + eyes.y, pupilRadius, 0, Math.PI * 2);

    ctx.fill();

    ctx.beginPath();

    ctx.arc(ball.x + 17 + eyes.x, ball.y - 13 + eyes.y, pupilRadius, 0, Math.PI * 2);

    ctx.fill();

}

function drawNormalFace()
{

    const blink = Date.now() % 3600 > 3470;

    ctx.strokeStyle = '#153f38';

    ctx.lineWidth = 3;

    ctx.lineCap = 'round';

    if (blink)
    {

        ctx.beginPath();

        ctx.moveTo(ball.x - 25, ball.y - 12);

        ctx.lineTo(ball.x - 9, ball.y - 12);

        ctx.moveTo(ball.x + 9, ball.y - 12);

        ctx.lineTo(ball.x + 25, ball.y - 12);

        ctx.stroke();

    }
    else
    {

        drawEyes(12, 15, 4);

    }

    ctx.beginPath();

    ctx.arc(ball.x, ball.y + 9, 18, .25, Math.PI - .25);

    ctx.strokeStyle = '#153f38';

    ctx.lineWidth = 4;

    ctx.stroke();

}

function drawWorriedFace()
{

    drawEyes(12, 16, 4);

    ctx.strokeStyle = '#153f38';

    ctx.lineWidth = 3;

    ctx.lineCap = 'round';

    ctx.beginPath();

    ctx.moveTo(ball.x - 29, ball.y - 35);

    ctx.lineTo(ball.x - 10, ball.y - 30);

    ctx.moveTo(ball.x + 10, ball.y - 30);

    ctx.lineTo(ball.x + 29, ball.y - 35);

    ctx.stroke();

    ctx.beginPath();

    ctx.arc(ball.x, ball.y + 29, 15, Math.PI + .25, Math.PI * 2 - .25);

    ctx.stroke();

}

function drawScaredFace()
{

    drawEyes(14, 19, 3.8);

    ctx.strokeStyle = '#153f38';

    ctx.lineWidth = 3;

    ctx.lineCap = 'round';

    ctx.beginPath();

    ctx.moveTo(ball.x - 31, ball.y - 38);

    ctx.lineTo(ball.x - 10, ball.y - 32);

    ctx.moveTo(ball.x + 10, ball.y - 32);

    ctx.lineTo(ball.x + 31, ball.y - 38);

    ctx.stroke();

    ctx.beginPath();

    ctx.ellipse(ball.x, ball.y + 19, 11, 15, 0, 0, Math.PI * 2);

    ctx.fillStyle = '#153f38';

    ctx.fill();

}

function drawTerrifiedFace()
{

    drawEyes(15, 20, 3.2);

    ctx.strokeStyle = '#153f38';

    ctx.lineWidth = 3;

    ctx.lineCap = 'round';

    ctx.beginPath();

    ctx.moveTo(ball.x - 32, ball.y - 39);

    ctx.lineTo(ball.x - 9, ball.y - 31);

    ctx.moveTo(ball.x + 9, ball.y - 31);

    ctx.lineTo(ball.x + 32, ball.y - 39);

    ctx.stroke();

    ctx.beginPath();

    ctx.moveTo(ball.x - 15, ball.y + 18);

    ctx.lineTo(ball.x - 8, ball.y + 12);

    ctx.lineTo(ball.x, ball.y + 20);

    ctx.lineTo(ball.x + 8, ball.y + 12);

    ctx.lineTo(ball.x + 15, ball.y + 18);

    ctx.stroke();

    ctx.beginPath();

    ctx.moveTo(ball.x + 34, ball.y - 27);

    ctx.quadraticCurveTo(ball.x + 43, ball.y - 18, ball.x + 36, ball.y - 10);

    ctx.quadraticCurveTo(ball.x + 29, ball.y - 18, ball.x + 34, ball.y - 27);

    ctx.fillStyle = 'rgba(84, 165, 196, .85)';

    ctx.fill();

}

function drawHurtFace()
{

    ctx.strokeStyle = '#153f38';

    ctx.lineWidth = 4;

    ctx.lineCap = 'round';

    ctx.beginPath();

    ctx.moveTo(ball.x - 28, ball.y - 22);

    ctx.lineTo(ball.x - 10, ball.y - 5);

    ctx.moveTo(ball.x - 10, ball.y - 22);

    ctx.lineTo(ball.x - 28, ball.y - 5);

    ctx.moveTo(ball.x + 10, ball.y - 22);

    ctx.lineTo(ball.x + 28, ball.y - 5);

    ctx.moveTo(ball.x + 28, ball.y - 22);

    ctx.lineTo(ball.x + 10, ball.y - 5);

    ctx.stroke();

    ctx.beginPath();

    ctx.moveTo(ball.x - 19, ball.y + 21);

    ctx.quadraticCurveTo(ball.x - 9, ball.y + 10, ball.x, ball.y + 21);

    ctx.quadraticCurveTo(ball.x + 9, ball.y + 31, ball.x + 19, ball.y + 19);

    ctx.stroke();

}

function drawMotionLines()
{

    if (!ball.grounded || Math.abs(ball.dx) < 3 || ball.trapped)
    {

        return;

    }

    const direction = ball.dx > 0 ? -1 : 1;

    const startX = ball.x + direction * (ball.radius + 12);

    ctx.strokeStyle = 'rgba(36, 88, 79, .28)';

    ctx.lineWidth = 3;

    ctx.lineCap = 'round';

    ctx.beginPath();

    ctx.moveTo(startX, ball.y - 12);

    ctx.lineTo(startX + direction * 20, ball.y - 12);

    ctx.moveTo(startX, ball.y + 2);

    ctx.lineTo(startX + direction * 28, ball.y + 2);

    ctx.moveTo(startX, ball.y + 16);

    ctx.lineTo(startX + direction * 16, ball.y + 16);

    ctx.stroke();

}

function drawBall()
{

    const trappedShake = ball.trapped ? Math.sin(Date.now() / 24) * 3.5 : 0;

    const impactShake = Date.now() < ball.impactUntil ? (Math.random() - .5) * ball.impactStrength : 0;

    ctx.save();

    ctx.translate(trappedShake + impactShake, impactShake * .45);

    drawMotionLines();

    ctx.save();

    ctx.shadowColor = 'rgba(0, 0, 0, .18)';

    ctx.shadowBlur = 10;

    ctx.shadowOffsetY = 6;

    ctx.beginPath();

    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);

    ctx.fillStyle = ball.color;

    ctx.fill();

    ctx.lineWidth = 4;

    ctx.strokeStyle = '#153f38';

    ctx.stroke();

    ctx.restore();

    const expression = faceState();

    if (expression === 'terrified')
    {

        drawTerrifiedFace();

    }
    else if (expression === 'scared')
    {

        drawScaredFace();

    }
    else if (expression === 'worried')
    {

        drawWorriedFace();

    }
    else if (expression === 'hurt')
    {

        drawHurtFace();

    }
    else
    {

        drawNormalFace();

    }

    ctx.restore();

}

function drawEffects()
{

    shockwaves.forEach(wave =>
    {

        ctx.beginPath();

        ctx.ellipse(wave.x, wave.y, wave.radius, wave.radius * .24, 0, 0, Math.PI * 2);

        ctx.strokeStyle = 'rgba(36, 88, 79, ' + wave.alpha + ')';

        ctx.lineWidth = 4;

        ctx.stroke();

    });

    particles.forEach(particle =>
    {

        ctx.beginPath();

        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);

        ctx.fillStyle = 'rgba(120, 108, 84, ' + particle.alpha + ')';

        ctx.fill();

    });

}

function drawFrame()
{

    drawBackground();

    drawEffects();

    drawBall();

}

function updateFear()
{

    if (!mouse.active)
    {

        ball.fear = 0;

        ball.trapped = false;

        return;

    }

    const differenceX = ball.x - mouse.x;

    const differenceY = ball.y - mouse.y;

    const distance = Math.hypot(differenceX, differenceY);

    ball.fear = Math.max(0, Math.min(1, 1 - distance / reactionDistance));

    const atLeftWall = ball.x - ball.radius <= 6;

    const atRightWall = ball.x + ball.radius >= canvas.width - 6;

    const cursorPushingLeft = mouse.x > ball.x;

    const cursorPushingRight = mouse.x < ball.x;

    ball.trapped = ball.grounded && distance < trappedDistance &&
        ((atLeftWall && cursorPushingLeft) || (atRightWall && cursorPushingRight));

}

function avoidMouse()
{

    updateFear();

    if (!ball.grounded)
    {

        return;

    }

    if (ball.trapped)
    {

        ball.dx = 0;

        status.textContent = 'The ball is trapped in the corner and shaking in fear!';

        return;

    }

    if (!mouse.active || ball.fear <= 0)
    {

        return;

    }

    const direction = ball.x >= mouse.x ? 1 : -1;

    const targetSpeed = minimumRollSpeed + (maximumRollSpeed - minimumRollSpeed) * ball.fear;

    const targetVelocity = direction * targetSpeed;

    ball.dx += (targetVelocity - ball.dx) * (.08 + ball.fear * .12);

    if (ball.fear > .55)
    {

        status.textContent = 'The ball looks scared and is trying to roll away from the cursor.';

    }
    else
    {

        status.textContent = 'The ball is watching the cursor carefully.';

    }

}

function keepRolling()
{

    if (!ball.grounded || ball.trapped)
    {

        return;

    }

    if (!mouse.active || ball.fear <= 0)
    {

        ball.dx *= .994;

        if (Math.abs(ball.dx) < minimumRollSpeed)
        {

            ball.dx = ball.dx < 0 ? -minimumRollSpeed : minimumRollSpeed;

        }

    }

    ball.dx = Math.max(-maximumRollSpeed, Math.min(maximumRollSpeed, ball.dx));

}

function randomAirColor()
{

    const availableColors = colors.filter(color => color !== ball.color);

    ball.color = availableColors[Math.floor(Math.random() * availableColors.length)];

}

function createImpact(height)
{

    const strength = Math.min(9, 4 + (height - hardImpactHeight) / 24);

    ball.impactUntil = Date.now() + 360;

    ball.impactStrength = strength;

    shockwaves.push({

        x: ball.x,

        y: floorY - 1,

        radius: 12,

        alpha: .8

    });

    for (let index = 0; index < 24; index++)
    {

        particles.push({

            x: ball.x + (Math.random() - .5) * 50,

            y: floorY - 5,

            dx: (Math.random() - .5) * 5.5,

            dy: -1.5 - Math.random() * 4.5,

            size: 2 + Math.random() * 4,

            alpha: .75 + Math.random() * .2,

            life: 30 + Math.floor(Math.random() * 22)

        });

    }

}

function updateEffects()
{

    for (let index = particles.length - 1; index >= 0; index--)
    {

        const particle = particles[index];

        particle.x += particle.dx;

        particle.y += particle.dy;

        particle.dy += .16;

        particle.dx *= .98;

        particle.life--;

        particle.alpha *= .95;

        if (particle.life <= 0 || particle.alpha < .03)
        {

            particles.splice(index, 1);

        }

    }

    for (let index = shockwaves.length - 1; index >= 0; index--)
    {

        const wave = shockwaves[index];

        wave.radius += 5;

        wave.alpha *= .88;

        if (wave.alpha < .03)
        {

            shockwaves.splice(index, 1);

        }

    }

}

function moveBall()
{

    avoidMouse();

    ball.dy += gravity;

    if (!ball.trapped)
    {

        ball.x += ball.dx;

    }

    ball.y += ball.dy;

    ball.rotation += ball.dx / ball.radius;

    let impact = false;

    if (ball.x + ball.radius >= canvas.width - 3 && ball.dx > 0)
    {

        ball.x = canvas.width - ball.radius - 3;

        if (!ball.trapped)
        {

            ball.dx = -Math.abs(ball.dx);

            if (ball.hasBeenClicked)
            {

                impact = true;

            }

        }

    }
    else if (ball.x - ball.radius <= 3 && ball.dx < 0)
    {

        ball.x = ball.radius + 3;

        if (!ball.trapped)
        {

            ball.dx = Math.abs(ball.dx);

            if (ball.hasBeenClicked)
            {

                impact = true;

            }

        }

    }

    if (ball.y - ball.radius <= 3 && ball.dy < 0)
    {

        ball.y = ball.radius + 3;

        ball.dy = Math.abs(ball.dy) * .72;

        if (ball.hasBeenClicked)
        {

            impact = true;

            status.textContent = 'Bonk! The ball hit the top wall.';

        }

    }

    if (!ball.grounded)
    {

        ball.jumpPeakY = Math.min(ball.jumpPeakY, ball.y);

    }

    if (ball.y + ball.radius >= floorY)
    {

        const wasFalling = !ball.grounded && ball.dy > 1.5;

        const landingHeight = floorY - ball.radius - ball.jumpPeakY;

        ball.y = floorY - ball.radius;

        ball.dy = 0;

        ball.grounded = true;

        if (wasFalling && ball.hasBeenClicked)
        {

            ball.hurtUntil = Date.now() + (landingHeight >= hardImpactHeight ? 1050 : 650);

            impact = true;

            if (landingHeight >= hardImpactHeight)
            {

                createImpact(landingHeight);

                status.textContent = 'WHAM! That was a hard landing.';

            }
            else
            {

                status.textContent = 'Ouch! The ball hit the ground.';

            }

        }

        ball.jumpPeakY = ball.y;

    }
    else
    {

        ball.grounded = false;

    }

    if (impact)
    {

        bounces++;

        bounceCount.textContent = bounces;

    }

    keepRolling();

    updateEffects();

    drawFrame();

}

function startAnimation()
{

    if (running) return;

    timer = setInterval(moveBall, 16);

    running = true;

    pause.textContent = 'Pause';

    status.textContent = 'Move the cursor near the ball. Click it to make it jump.';

}

function pauseAnimation()
{

    clearInterval(timer);

    timer = null;

    running = false;

    pause.textContent = 'Resume';

    status.textContent = 'Animation paused.';

}

function mousePosition(event)
{

    const bounds = canvas.getBoundingClientRect();

    return {

        x: (event.clientX - bounds.left) * (canvas.width / bounds.width),

        y: (event.clientY - bounds.top) * (canvas.height / bounds.height)

    };

}

function ballClicked(x, y)
{

    const differenceX = x - ball.x;

    const differenceY = y - ball.y;

    return differenceX * differenceX + differenceY * differenceY <= ball.radius * ball.radius;

}

canvas.addEventListener('mousemove', event =>
{

    const location = mousePosition(event);

    mouse.x = location.x;

    mouse.y = location.y;

    mouse.active = true;

});

canvas.addEventListener('mouseleave', () =>
{

    mouse.active = false;

    ball.fear = 0;

    ball.trapped = false;

});

canvas.addEventListener('click', event =>
{

    const location = mousePosition(event);

    if (!ballClicked(location.x, location.y))
    {

        status.textContent = 'The ball is watching you. Click directly on it.';

        return;

    }

    clicks++;

    clickCount.textContent = clicks;

    ball.hasBeenClicked = true;

    if (!ball.grounded)
    {

        randomAirColor();

        ball.dy = -12.5;

        ball.hurtUntil = 0;

        ball.trapped = false;

        status.textContent = 'Nice catch! The ball changed color and bounced back up.';

        drawFrame();

        return;

    }

    ball.dy = -13.5;

    ball.grounded = false;

    ball.trapped = false;

    ball.hurtUntil = 0;

    ball.impactUntil = 0;

    ball.jumpPeakY = ball.y;

    if (location.x < ball.x)
    {

        ball.dx = Math.min(maximumRollSpeed, Math.abs(ball.dx) + 1.1);

    }
    else
    {

        ball.dx = -Math.min(maximumRollSpeed, Math.abs(ball.dx) + 1.1);

    }

    status.textContent = 'The ball is scared! It jumped away from the click.';

    drawFrame();

});

pause.addEventListener('click', () =>
{

    if (running) pauseAnimation();

    else startAnimation();

});

reset.addEventListener('click', () =>
{

    clearInterval(timer);

    timer = null;

    running = false;

    ball.x = 150;

    ball.y = 300;

    ball.radius = 48;

    ball.dx = 3.2;

    ball.dy = 2.4;

    ball.rotation = 0;

    ball.grounded = false;

    ball.hurtUntil = 0;

    ball.trapped = false;

    ball.fear = 0;

    ball.jumpPeakY = 300;

    ball.impactUntil = 0;

    ball.impactStrength = 0;

    ball.hasBeenClicked = false;

    mouse.active = false;

    particles.length = 0;

    shockwaves.length = 0;

    clicks = 0;

    bounces = 0;

    clickCount.textContent = '0';

    bounceCount.textContent = '0';

    drawFrame();

    startAnimation();

});

drawFrame();

startAnimation();