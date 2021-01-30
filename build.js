'use strict';

const path = require('path');

const fse = require('fs-extra');
const ejs = require('ejs');
const showdown = require('showdown');
const showdownHighlight = require('showdown-highlight');

showdown.setFlavor('github');
const converter = new showdown.Converter({
  extensions: [
    showdownHighlight,
  ],
});

Promise.resolve().then(async () => {

  const DIR_THEME = path.join(__dirname, 'theme');
  const DIR_BUILD = path.join(__dirname, 'build');
  const DIR_POSTS = path.join(__dirname, 'posts');

  await fse.emptyDir(DIR_BUILD);
  await fse.ensureDir(DIR_BUILD);

  await fse.copy(path.join(DIR_THEME, 'css'), path.join(DIR_BUILD, 'css'));
  await fse.copy(path.join(DIR_THEME, 'img'), path.join(DIR_BUILD, 'img'));

  // Get Index
  const indexEjs = await fse.readFile(path.join(DIR_THEME, 'index.ejs'), 'utf8');

  // Get posts folders
  const postsFolders = (await fse.readdir(DIR_POSTS)).filter(name => {
    if( name.startsWith('.') ) return false;
    return true;
  })

  // Get posts files
  const posts = await Promise.all(postsFolders.map(async id => {
    const text = await fse.readFile(path.join(DIR_POSTS, id, 'index.md'), 'utf8');
    const html = converter.makeHtml(text);
    const index = parseInt(id.split('-')[0]);
    const title = text.split('\n')[0].substring('# '.length);

    return {
      id,
      index,
      title,
      text,
      html,
    };
  }));

  posts.sort((a, b) => b.index - a.index);

  // Write posts
  for (const post of Object.values(posts)) {
    const postHtml = ejs.render(indexEjs, { post });

    await fse.ensureDir(path.join(DIR_BUILD, post.id));
    await fse.writeFile(path.join(DIR_BUILD, post.id, 'index.html'), postHtml);

    if (await fse.pathExists(path.join(DIR_POSTS, post.id, 'img'))) {
      await fse.copy(path.join(DIR_POSTS, post.id, 'img'), path.join(DIR_BUILD, post.id, 'img'));
    }
  }

  // Write index
  const indexHtml = ejs.render(indexEjs, {
    posts,
  });
  await fse.writeFile(path.join(DIR_BUILD, 'index.html'), indexHtml);

}).catch(console.error);