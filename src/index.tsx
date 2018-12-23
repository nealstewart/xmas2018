import './index.css';
import { range } from 'lodash';

type Vector2d = [number, number];

interface Particle {
  location: Vector2d;
  velocity: Vector2d;
  radius: number;
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
location[1] + radius + 10 >= height

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

  state.deadSnow = [
    ...state.deadSnow, 
    ...state.particles.filter(p => isAtBottom(p, canvas.height))
  ];

  state.particles = state.particles.filter(p => {
    return p.location[0] >= 0 && p.location[0] < canvas.width && !isAtBottom(p, canvas.height);
  });
}

function createParticles(touchPoint: Vector2d) {
  const pointsToAdd = Math.ceil(Math.random() * 5);

  return range(0, pointsToAdd).map<Particle>(() => ({
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

(() => {
  let state: State = {
    particles: [],
    deadSnow: [],
  };

  let canvas = document.querySelector('canvas')!;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const touchHandler = (evt: TouchEvent) => {
    const allNewParticles = Array.from(evt.touches)
      .reduce((all, t) => [...all, ...createParticles([t.clientX, t.clientY])], []);

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
