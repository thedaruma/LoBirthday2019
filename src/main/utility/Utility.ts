export const createThrottle = (limit, func) => {
  let lastCalled: Date;
  return () => {
    if (!lastCalled || Date.now() - lastCalled.getTime() >= limit) {
      func();
      lastCalled = new Date();
    }
  }
};

export const createRandom = (upTo) => () => getRandomCeil(upTo);

export const getRandomFloor = (upTo) => Math.floor(Math.random() * upTo);

export const getRandomCeil = (upTo) => Math.ceil(Math.random() * upTo);
export const getUID = ()=>`_${Math.random().toString(36).substr(2, 9)}`;
export enum Directions {
  up,
  down,
  left,
  right
}