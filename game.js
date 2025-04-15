import { initHomePage, updateHomePage } from './js/page_home.js'
import { initHeroSelectPage, updateHeroSelectPage } from './js/page_hero_select.js'
import { initGamePage, updateGamePage } from './js/page_game.js'

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

let currentPage = 'home';

function switchPage(page) {
  currentPage = page;
  if (page === 'home') initHomePage(ctx, switchPage, canvas);
  if (page === 'heroSelect') initHeroSelectPage(ctx, switchPage, canvas);
  if (page === 'game') initGamePage(ctx, switchPage, canvas);
}

switchPage('home');

function loop() {
  requestAnimationFrame(loop);
  if (currentPage === 'home') updateHomePage();
  if (currentPage === 'heroSelect') updateHeroSelectPage();
  if (currentPage === 'game') updateGamePage();
}
loop();