import SearchkitRequest, {
  RangeFacet,
  DateRangeFacet,
  MultiMatchQuery,
  SearchkitConfig
} from '../../src'
import nock from 'nock'
import ResultsNoHitsMock from '../__mock-data__/Facets/results.json'

describe('Numeric Range + Date Range Facet Filters', () => {
  describe('Numeric Range', () => {
    const config: SearchkitConfig = {
      host: 'http://localhost:9200',
      index: 'movies',
      hits: {
        fields: ['actors', 'writers']
      },
      query: new MultiMatchQuery({ fields: ['actors', 'writers', 'title^4', 'plot'] }),
      facets: [
        new RangeFacet({
          field: 'imdbRating',
          label: 'IMDB Rating',
          identifier: 'imdbRating',
          range: {
            min: 0,
            max: 100,
            interval: 10
          }
        }),
        new DateRangeFacet({
          field: 'released',
          label: 'Released',
          identifier: 'released'
        })
      ]
    }

    it('Combination of min and max number range facets', async () => {
      const request = SearchkitRequest(config)
      request.setFilters([
        {
          identifier: 'imdbRating',
          min: 5,
          max: 10
        }
      ])

      let lastESRequest

      const scope = nock('http://localhost:9200')
        .post('/movies/_search')
        .reply(200, (uri, body) => {
          expect(body).toMatchSnapshot()
          lastESRequest = body
          return ResultsNoHitsMock
        })
        .persist()

      let response = await request.execute({
        facets: true
      })
      expect(response.facets.find(({label}) => label === "IMDB Rating")).toMatchSnapshot("imdb rating values")
      expect(response.summary.appliedFilters).toMatchInlineSnapshot(`
        Array [
          Object {
            "display": "RangeSliderFacet",
            "id": "imdbRating_5_10",
            "identifier": "imdbRating",
            "label": "IMDB Rating",
            "max": 10,
            "min": 5,
            "type": "NumericRangeSelectedFilter",
          },
        ]
      `)
      expect(lastESRequest.aggs).toMatchInlineSnapshot(`
        Object {
          "facet_bucket_all": Object {
            "aggs": Object {},
            "filter": Object {
              "bool": Object {
                "must": Array [
                  Object {
                    "range": Object {
                      "imdbRating": Object {
                        "gte": 5,
                        "lte": 10,
                      },
                    },
                  },
                ],
              },
            },
          },
          "facet_bucket_imdbRating": Object {
            "aggs": Object {
              "imdbRating": Object {
                "histogram": Object {
                  "extended_bounds": Object {
                    "max": 100,
                    "min": 0,
                  },
                  "field": "imdbRating",
                  "interval": 10,
                  "min_doc_count": 0,
                },
              },
            },
            "filter": Object {
              "bool": Object {
                "must": Array [],
              },
            },
          },
          "facet_bucket_released": Object {
            "aggs": Object {},
            "filter": Object {
              "bool": Object {
                "must": Array [
                  Object {
                    "range": Object {
                      "imdbRating": Object {
                        "gte": 5,
                        "lte": 10,
                      },
                    },
                  },
                ],
              },
            },
          },
        }
      `)
    })

  })
})
