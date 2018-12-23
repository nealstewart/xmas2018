import './index.css';
import { range, difference } from 'lodash';

type Vector2d = [number, number];

interface Particle {
  location: Vector2d;
  velocity: Vector2d;
  radius: number;
  timeSinceDeath: number;
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
location[1] + radius >= height

const update = (canvas: HTMLCanvasElement, state:State, timeDiff: number) => {
  state.particles.forEach(p => {
    const [x, y] = p.location;
    const [xVelocity, yVelocity] = p.velocity;
    p.velocity = [xVelocity * 0.98, Math.min(yVelocity + gravity * timeDiff, maxSpeed)]
    p.location = [
      x + xVelocity * timeDiff,
      y + yVelocity * timeDiff,
    ];
  });

  const recentlyDead = state.deadSnow.filter(({timeSinceDeath}) => timeSinceDeath < 10);
  const shouldStop = (p: Particle) => isAtBottom(p, canvas.height) || recentlyDead.some(s => overlap(p, s));
  
  state.deadSnow.forEach(d => d.timeSinceDeath += 1);

  state.deadSnow = [
    ...state.deadSnow, 
    ...state.particles.filter(shouldStop)
  ];

  state.deadSnow.forEach((p) => {
    if (!isAtBottom(p, canvas.height)) {
      p.location[1] = Math.min(canvas.height, p.location[1] + 0.2); 
    }
  });

  state.deadSnow = state.deadSnow.filter(({radius}) => radius > 0.5);
  state.particles = difference(state.particles, state.deadSnow);

  state.particles = state.particles.filter(p =>
    p.location[0] >= 0 && p.location[0] < canvas.width);
}

function createParticles(touchPoint: Vector2d) {
  const pointsToAdd = Math.ceil(Math.random() * 5);

  return range(0, pointsToAdd).map<Particle>(() => ({
    timeSinceDeath: 0,
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
