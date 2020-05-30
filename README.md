# rxdb-hooks

A set of really simple hooks for integrating a React application with RxDB.

Nothing fancy, just conveniently handles some common issues & use cases such as:

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

**_coming soon_**

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

```javascript
function useRxDB(): RxDatabase
```

Returns the RxDatabase instance made available by the `<Provider />`

#### Example

```javascript
const db = useRxDB();
```

<hr />

### `useRxCollection`

```javascript
function useRxCollection<T>(name: string): RxCollection<T> | null
```

Given a collection name returns an RxCollection instance, if found in RxDatabase.

#### Example

```javascript
const collection = useRxCollection('characters');
```

<hr />

### `useRxQuery`

```javascript
function useRxQuery<T>(query: RxQuery, options?: UseRxQueryOptions): RxQueryResult<T>
```

Subscribes to given RxQuery object providing query results and some helpful extra state variables.

#### `options: UseRxQueryOptions`

| Option         | Type              | Required | Default  | Description                                                                                                                                    |
| -------------- | ----------------- | :------: | :------: | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `pageSize`     | `number`          |    -     |   `0`    | enables pagination & defines page limit; `0` disables pagination and fetches everything                                                        |
| `startingPage` | `number`          |    -     |    -     | 1-based number; enables tradional pagination mode & determines which page to fetch; works in combination with pageSize                         |
| `sortBy`       | `string`          |    -     |    -     | a property to sort results by; an index for this property should already exist                                                                 |
| `sortOrder`    | `"asc" \| "desc"` |    -     | `"desc"` | determines sort order for `sortBy` property                                                                                                    |
| `json`         | `boolean`         |    -     | `false`  | when `true` resulting documents will be converted to plain JavaScript objects; equivalent to manually calling `.toJSON()` on each `RxDocument` |

#### `result: RxQueryResult<T>`

| Property      | Type                     | Description                                                                                                                             |
| ------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `result`      | `T[] \| RxDocument<T>[]` | the resulting array of objects or `RxDocument` instances, depending on `json` option                                                    |
| `isFetching`  | `boolean`                | fetching state indicator                                                                                                                |
| `isExhausted` | `boolean`                | flags result list as "isExhausted", meaning all documents have been already fetched; relevant when pagination is enabled via `pageSize` |
| `fetchMore`   | `() => void`             | a function to be called by the consumer to request documents of the next page                                                           |
| `resetList`   | `() => void`             | a function to be called by the consumer to reset paginated results                                                                      |

#### Example

```javascript
// fetch all results of a collection
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
const {
  result: characters,
  isFetching,
  fetchMore,
  isExhausted,
} = useRxQuery(query, { pageSize: 5 }); // fetch first page of 5 results

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
const { result: characters, isFetching, fetchPage } = useRxQuery(query, {
  pageSize: 5, // fetch 5 results per page
  startingPage: 1, // start by showing the 1st page (1-based index)
});

if (isFetching) {
  return 'Loading...';
}

return (
  <CharacterList>
    {characters.map((character, index) => (
      <Character character={character} key={index} />
    ))}
    <button
      onClick={() => {
        fetchPage(2);
      }}
    >
      2nd page
    </button>
  </CharacterList>
);
```

<hr />

### `useRxData`

```javascript
function useRxData<T>(
	collectionName: string,
	queryConstructor: ((collection: RxCollection<T>) => RxQuery<T> | undefined) | undefined,
	options?: UseRxQueryOptions
): RxQueryResult<T>
```

Convenience wrapper around `useRxQuery` that expects a collection name & a query constructor function

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

```javascript
function useRxDocument<T>(
	collectionName: string,
	id?: string,
	options?: UseRxDocumentOptions
): RxDocumentRet<T>
```

Convenience hook for fetching a single document from a collection.

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
by indicating the state as fetching (aka `isFetching:true`)

## LICENSE

MIT
