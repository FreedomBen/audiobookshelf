var axios = require('axios')

class OpenLibrary {
  constructor() {
    this.baseUrl = 'https://openlibrary.org'
  }

  get(uri) {
    return axios.get(`${this.baseUrl}/${uri}`).then((res) => {
      return res.data
    }).catch((error) => {
      console.error('Failed', error)
      return false
    })
  }

  async isbnLookup(isbn) {
    var lookupData = await this.get(`/isbn/${isbn}`)
    if (!lookupData) {
      return {
        errorCode: 404
      }
    }
    return lookupData
  }

  async getWorksData(worksKey) {
    var worksData = await this.get(`${worksKey}.json`)
    if (!worksData) {
      return {
        errorMsg: 'Works Data Request failed',
        errorCode: 500
      }
    }
    if (!worksData.covers) worksData.covers = []
    var coverImages = worksData.covers.filter(c => c > 0).map(c => `https://covers.openlibrary.org/b/id/${c}-L.jpg`)
    var description = null
    if (worksData.description) {
      if (typeof worksData.description === 'string') {
        description = worksData.description
      } else {
        description = worksData.description.value || null
      }
    }
    return {
      id: worksKey.split('/').pop(),
      key: worksKey,
      covers: coverImages,
      first_publish_date: worksData.first_publish_date,
      description: description
    }
  }

  parsePublishYear(doc, worksData) {
    if (doc.first_publish_year && !isNaN(doc.first_publish_year)) return doc.first_publish_year
    if (worksData.first_publish_date) {
      var year = worksData.first_publish_date.split('-')[0]
      if (!isNaN(year)) return year
    }
    return null
  }

  async cleanSearchDoc(doc) {
    var worksData = await this.getWorksData(doc.key)
    return {
      title: doc.title,
      author: doc.author_name ? doc.author_name.join(', ') : null,
      publishYear: this.parsePublishYear(doc, worksData),
      edition: doc.cover_edition_key,
      cover: doc.cover_edition_key ? `https://covers.openlibrary.org/b/OLID/${doc.cover_edition_key}-L.jpg` : null,
      ...worksData
    }
  }

  async search(query) {
    var queryString = Object.keys(query).map(key => key + '=' + query[key]).join('&')
    var lookupData = await this.get(`/search.json?${queryString}`)
    if (!lookupData) {
      return {
        errorCode: 404
      }
    }
    var searchDocs = await Promise.all(lookupData.docs.map(d => this.cleanSearchDoc(d)))
    return searchDocs
  }

  async searchTitle(title) {
    title = encodeURIComponent(title);
    var lookupData = await this.get(`/search.json?title=${title}`)
    if (!lookupData) {
      return {
        errorCode: 404
      }
    }
    var searchDocs = await Promise.all(lookupData.docs.map(d => this.cleanSearchDoc(d)))
    return searchDocs
  }
}
module.exports = OpenLibrary