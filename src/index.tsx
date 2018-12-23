import './index.css';
import { range, difference } from 'lodash';

type Vector2d = [number, number];

interface Particle {
  location: Vector2d;
  velocity: Vector2d;
  radius: number;
  timeSinceDeath: number;
  neighbors: number;
}

interface State {
  deadSnow: Particle[];
  particles: Particle[];
}

const getDirection = () => Math.random() * 2 - 1 >= 0 ? 1 : -1;

const JITTER_PIXELS = 1;
const getJitterAmount = () => Math.random() * JITTER_PIXELS;

const render = (canvas: HTMLCanvasElement, state: State) => {
  const context = canvas.getContext('2d')!;
  context.fillStyle = "#000032";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const renderSnow = (color: string, {location: [x, y], radius}: Particle) => {
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2, true); 
    context.fill();
  }

  state.particles.forEach(renderSnow.bind(null, 'white'));
  state.deadSnow.forEach(renderSnow.bind(null, 'white'));
}

const gravity = 1 / 3000;

const maxSpeed = 0.1;

const isAtBottom = ({location, radius}: Particle, height: number) =>
  location[1] + radius >= height;

const updateLivingParticle = (particle: Particle, timeDiff: number) => {
  const [x, y] = particle.location;
  const [xVelocity, yVelocity] = particle.velocity;
  particle.velocity = [xVelocity * 0.98, Math.min(yVelocity + gravity * timeDiff, maxSpeed)]
  particle.location = [
    x + xVelocity * timeDiff,
    y + yVelocity * timeDiff,
  ];
};

const updateDeadParticle = (particle: Particle, height: number, timeDiff: number) => {
  if (!isAtBottom(particle, height)) {
    particle.location[1] = Math.min(height, particle.location[1] + 0.2); 
  }

  particle.timeSinceDeath += timeDiff;
  particle.radius = particle.radius * (1 - 0.008 / (particle.neighbors * 2));
};

const findTheDead = (particles: Particle[], deadSnow: Particle[], height: number) => {
  const recentlyDead = deadSnow.filter(({timeSinceDeath}) => timeSinceDeath <= 400);

  const atBottom = particles.filter(p => isAtBottom(p, height))

  const collided = particles.map(p => ({
    overlapping: recentlyDead.filter(s => overlap(p, s)),
    particle: p,
  })).filter(({overlapping}) => overlapping.length > 0);
  
  return {
    atBottom,
    collided
  };
}

const update = (canvas: HTMLCanvasElement, state:State, timeDiff: number) => {
  state.particles.forEach(p => updateLivingParticle(p, timeDiff));
  state.deadSnow.forEach(p => updateDeadParticle(p, canvas.height, timeDiff));
  state.deadSnow = state.deadSnow.filter(({radius}) => radius > 1);

  const {atBottom, collided} = findTheDead(state.particles, state.deadSnow, canvas.height);

  // Let the overlapping know they have neighbours.
  collided.forEach(p => p.overlapping.forEach(o => o.neighbors += 1));
  const particlesDeadByCollision = collided.map(p => p.particle);
  const newlyDead = [...particlesDeadByCollision, ...atBottom];
  state.deadSnow = [...state.deadSnow, ...newlyDead];
  state.particles = difference(state.particles, newlyDead);
}

function createParticles(touchPoint: Vector2d) {
  const pointsToAdd = Math.ceil(Math.random() * 5);

  return range(0, pointsToAdd).map<Particle>(() => ({
    timeSinceDeath: 0,
    neighbors: 1,
    radius: Math.random() * 1.5 + 2,
    location: [
      touchPoint[0] + getJitterAmount() * getDirection(),
      touchPoint[1] + getJitterAmount() * getDirection()
    ],
    velocity: [
      Math.random() / 10 * getDirection(),
      -getJitterAmount() / 4 
    ]
  }));
}

const subtractVector = ([a1, a2]: Vector2d, [b1, b2]: Vector2d): Vector2d =>
  [a1 - b1, a2 - b2];

const lengthVector = ([x, y]: Vector2d) => Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));

const overlap = (a: Particle, b: Particle) =>
  lengthVector(subtractVector(a.location, b.location)) <= (a.radius + b.radius);

(() => {
  let state: State = {
    particles: [],
    deadSnow: [],
  };

  let canvas = document.querySelector('canvas')!;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  document.addEventListener('click', () => {
    document.documentElement.requestFullscreen();
  });

  const touchHandler = (evt: TouchEvent) => {

    const touchArray = Array.from(evt.touches).map<Vector2d>(touch => [touch.clientX, touch.clientY]);

    const allNewParticles = 
      touchArray.reduce(
        (all, t) => [...all, ...createParticles(t)],
        []);

    state.particles = [
      ...allNewParticles,
      ...state.particles
    ];
  };

  canvas.addEventListener('touchmove', touchHandler);
  canvas.addEventListener('touchstart', touchHandler);

  let lastTime = Date.now();
  const renderLoop = () => {
    render(canvas, state);

    const currentTime = Date.now();
    update(canvas, state, currentTime - lastTime);

    lastTime = currentTime;
    requestAnimationFrame(renderLoop);
  };

  requestAnimationFrame(renderLoop);
})();
