/* global cp */
require('colorful').toxic()
require('shelljs/global')
const path = require('path')
const co = require('co')
const pify = require('pify')
const readPost = require('readpost')
const table = require('markdown-table')
const formatDate = require('./utils/formatDate')
const fs = pify(require('fs'))
const glob = pify(require("glob"))
const config = require('../rawmeat')

co(function*() {
  const blogsLocation = path.join(process.cwd(), 'blogs/!(README).md');
  const files = yield glob(blogsLocation)
    // get file meta and push to blogs array
  var blogs = []
  for (var file of files) {
    var blog = yield fs.readFile(file, 'utf8')
    var blogContent = readPost(blog)
    var meta = blogContent.meta
    meta.filename = path.basename(file)
    meta.content = blogContent.content
    blogs.push(meta)
  }
  // sort blogs from a to z
  // if obj.top is true set it top
  const order = config.order === 'newest' ? 1 : -1
  blogs = blogs.sort((a, b) => {
      if (a.top && !b.top) {
        return -1
      }
      if (b.top && !a.top) {
        return 1
      }
      return (new Date(b.date) - new Date(a.date)) * order
    })
    // generate post list table in array format
  const indexTable = [
    ['标题', '分类', '日期']
  ]
  const indexApiList = []
  for (var blog of blogs) {
    // push a blog item to blogs array
    indexTable.push([
      `[${blog.top ? '[置顶] ' : ''}${blog.title}](/blogs/${blog.filename})`,
      Array.isArray(blog.categories) ? blog.categories.join(',') : blog.categories,
      formatDate(blog.date)
    ])
    if (!config.skipApi) {
      indexApiList.push(Object.assign({}, blog, {
          postApiPath: blog.filename.replace(/\.md$/, '.json')
        }))
        // generate api for the blog index
      yield fs.writeFile(`${process.cwd()}/api/index.json`, JSON.stringify(indexApiList, null, 2), 'utf8')
        // generate api for the blog post
      yield fs.writeFile(`${process.cwd()}/api/${blog.filename.replace(/\.md$/, '.json')}`, JSON.stringify(blog, null, 2), 'utf8')
    }
  }
  // parse README template and replace data with user configs
  var readmeLocation = path.join(process.cwd(), 'scripts/templates/README.md')
  var readme = yield fs.readFile(readmeLocation, 'utf8')
  readme = readme
    .replace(/__SITE_NAME__/g, config.sitename)
    .replace(/__DESCRIPTION__/g, config.description)
    .replace(/__POST_LIST__/g, table(indexTable))
    .replace(/__LICENSE__/g, config.license)
    // generate README in root directory
  yield fs.writeFile(process.cwd() + '/README.md', readme, 'utf8')
    // copy README to ./blogs
  cp('-f', process.cwd() + '/README.md', process.cwd() + '/blogs/README.md')
  console.log('成功了 ( ゜- ゜)つロ'.green)
}).catch(err => console.log(err))
