# rxdb-hooks

<a href="https://travis-ci.com/cvara/rxdb-hooks">
  <img src="https://travis-ci.com/cvara/rxdb-hooks.svg?branch=master" />
</a>

<a href="https://codecov.io/gh/cvara/rxdb-hooks">
  <img src="https://codecov.io/gh/cvara/rxdb-hooks/branch/master/graph/badge.svg" />
</a>

<a href="https://www.npmjs.com/package/rxdb-hooks">
  <img src="https://badge.fury.io/js/rxdb-hooks.svg" alt="npm version">
</a>

A set of simple hooks for integrating a React application with RxDB.

Nothing fancy, just conveniently handles common use cases such as:

- pagination
- maintaining useful state information (i.e. data fetching or data exhaustion during pagination)
- unsubscribing to queries on component unmount

## Table of Contents

- [Installation](#installation)
- [API](#api)
  - [`Provider`](#provider)
  - [`useRxDB`](#userxdb)
  - [`useRxCollection`](#userxcollection)
  - [`useRxQuery`](#userxquery)
  - [`useRxData`](#userxdata)
  - [`useRxDocument`](#userxdocument)
- [Recipes](#recipes)
- [LICENSE](#license)

## Installation

```
npm install rxdb-hooks
```

## API

### `Provider`

The `<Provider />` makes the RxDatabase instance available to nested components and is required for all subsequent hooks to work.

#### Props

| Property      | Type         | Required | Default | Description                                                |
| ------------- | ------------ | :------: | :-----: | ---------------------------------------------------------- |
| `db`          | `RxDatabase` |  **\***  |    -    | the RxDatabase instance to consume data from               |
| `idAttribute` | `string`     |    -     | `"_id"` | used by `useRxDocument` when querying for single documents |

<hr />

### `useRxDB`

Returns the RxDatabase instance made available by the `<Provider />`

```javascript
function useRxDB(): RxDatabase
```

#### Example

```javascript
const db = useRxDB();
```

<hr />

### `useRxCollection`

Given a collection name returns an RxCollection instance, if found in RxDatabase.

```javascript
function useRxCollection<T>(name: string): RxCollection<T> | null
```

#### Example

```javascript
const collection = useRxCollection('characters');
```

<hr />

### `useRxQuery`

Subscribes to given RxQuery object providing query results and some helpful extra state variables.

```javascript
function useRxQuery<T>(query: RxQuery, options?: UseRxQueryOptions): RxQueryResult<T>
```

#### `options: UseRxQueryOptions`

| Option       | Type                         | Required |     Default     | Description                                                                                                                                    |
| ------------ | ---------------------------- | :------: | :-------------: | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `pageSize`   | `number`                     |    -     |        -        | enables pagination & defines page limit                                                                                                        |
| `pagination` | `"Traditional" | "Infinite"` |    -     | `"Traditional"` | determines pagination mode                                                                                                                     |
| `json`       | `boolean`                    |    -     |     `false`     | when `true` resulting documents will be converted to plain JavaScript objects; equivalent to manually calling `.toJSON()` on each `RxDocument` |

#### `result: RxQueryResult<T>`

| Property      | Type                     | Description                                                                                                            |
| ------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `result`      | `T[] | RxDocument<T>[]`  | the resulting array of objects or `RxDocument` instances, depending on `json` option                                   |
| `isFetching`  | `boolean`                | fetching state indicator                                                                                               |
| `currentPage` | `number`                 | relevant in **all** pagination modes; holds number of current page                                                     |
| `isExhausted` | `boolean`                | relevant in **Infinite** pagination; flags result list as "exhausted", meaning all documents have been already fetched |
| `fetchMore`   | `() => void`             | relevant in **Infinite** pagination; a function to be called by the consumer to request documents of the next page     |
| `resetList`   | `() => void`             | relevant in **Infinite** pagination; a function to be called by the consumer to reset paginated results                |
| `pageCount`   | `number`                 | relevant in **Traditional** pagination; holds the total number of pages available                                      |
| `fetchPage`   | `(page: number) => void` | relevant in **Traditional** pagination; a function to be called by the consumer to request results of a specific page  |

#### Simple Example

```javascript
const collection = useRxCollection('characters');

const query = collection
  .find()
  .where('affiliation')
  .equals('Jedi');

const { result } = useRxQuery(query);
```

#### Infinite Scroll Pagination Example

```javascript
const collection = useRxCollection('characters');

const query = collection
  .find()
  .where('affiliation')
  .equals('Jedi');

const { result: characters, isFetching, fetchMore, isExhausted } = useRxQuery(
  query,
  {
    pageSize: 5,
    pagination: 'Infinite',
  }
);

if (isFetching) {
  return 'Loading...';
}

return (
  <CharacterList>
    {characters.map((character, index) => (
      <Character character={character} key={index} />
    ))}
    {!isExhausted && <button onClick={fetchMore}>load more</button>}
  </CharacterList>
);
```

#### Traditional Pagination Example

```javascript
const collection = useRxCollection('characters');

const query = collection
  .find()
  .where('affiliation')
  .equals('Jedi');

const { result: characters, isFetching, fetchPage, pageCount } = useRxQuery(
  query,
  {
    pageSize: 5,
    pagination: 'Traditional',
  }
);

if (isFetching) {
  return 'Loading...';
}

// render results and leverage pageCount to render page navigation
return (
  <div>
    <CharacterList>
      {characters.map((character, index) => (
        <Character character={character} key={index} />
      ))}
    </CharacterList>
    <div>
      {Array(pageCount)
        .fill()
        .map((x, i) => (
          <button
            onClick={() => {
              fetchPage(i + 1);
            }}
          >
            page {i + 1}
          </button>
        ))}
    </div>
  </div>
);
```

<hr />

### `useRxData`

Convenience wrapper around `useRxQuery` that expects a collection name & a query constructor function

```javascript
function useRxData<T>(
	collectionName: string,
	queryConstructor: ((collection: RxCollection<T>) => RxQuery<T> | undefined) | undefined,
	options?: UseRxQueryOptions
): RxQueryResult<T>
```

#### Example

```javascript
const { result } = useRxData('characters', collection =>
  collection
    .find()
    .where('affiliation')
    .equals('Jedi')
);
```

<hr />

### `useRxDocument`

Convenience hook for fetching a single document from a collection.

```javascript
function useRxDocument<T>(
	collectionName: string,
	id?: string,
	options?: UseRxDocumentOptions
): RxDocumentRet<T>
```

#### `id`

The id of the document

#### `options`

| Option        | Type      | Required | Default | Description                                                                                      |
| ------------- | --------- | :------: | :-----: | ------------------------------------------------------------------------------------------------ |
| `idAttribute` | `string`  |    -     | `"_id"` | enables overriding the id attribute; has precedence over `idAttribute` set by the `<Provider />` |
| `json`        | `boolean` |    -     | `false` | converts resulting RxDocument to plain javascript object                                         |

#### Example

```javascript
const { result: Yoda } = useRxDocument('characters', 'Yoda', {
  idAttribute: 'name',
});
```

## Recipes

### Query and Query Constructor memoization

By design, `useRxQuery` will re-subscribe to `query` object whenever it changes, allowing
for query criteria to be modified during component updates. For this reason, to
avoid unnecessary re-subscriptions, query should be memoized (i.e. via react's `useMemo`):

```javascript
const collection = useRxCollection('characters');

const query = useMemo(
  () =>
    collection
      .find()
      .where('affiliation')
      .equals(affiliation), // 👈 could come from component props
  [collection, affiliation]
);

const { result } = useRxQuery(query);
```

Same goes for `useRxData` and the `queryConstructor` function:

```javascript
const queryConstructor = useCallback(
  collection =>
    collection
      .find()
      .where('affiliation')
      .equals(affiliation), // 👈 could come from component props
  [affiliation]
);

const { result } = useRxData('characters', queryConstructor);
```

### Lazy instantiation of RxDatabase & RxCollections

All rxdb-hooks give you the ability to lazily instantiate the database and the
collections within it. Initial delay until the above become available is absorbed
by indicating the state as fetching (`isFetching:true`)

### Mutations

Performing mutations on data is possible through the APIs provided by [RxDocument](https://rxdb.info/rx-document.html#functions)
and [RxCollection](https://rxdb.info/rx-collection.html#functions):

#### Example

```javascript
const collection = useRxCollection('characters');

collection.upsert({
  name: 'Luke Skywalker',
  affiliation: 'Jedi',
});
```

## LICENSE

MIT
