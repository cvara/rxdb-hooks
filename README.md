# rxdb-hooks

<a href="https://circleci.com/gh/cvara/rxdb-hooks/tree/master">
  <img src="https://circleci.com/gh/cvara/rxdb-hooks/tree/master.svg?style=shield" />
</a>

<a href="https://codecov.io/gh/cvara/rxdb-hooks">
  <img src="https://codecov.io/gh/cvara/rxdb-hooks/branch/master/graph/badge.svg" />
</a>

<a href="https://www.npmjs.com/package/rxdb-hooks">
  <img src="https://badge.fury.io/js/rxdb-hooks.svg" alt="npm version">
</a>

<a href="https://www.npmjs.com/package/rxdb-hooks">
  <img src="https://img.shields.io/npm/dm/rxdb-hooks.svg" alt="downloads">
</a>

## Table of Contents

<details>
  <summary>Click to expand</summary>

- [About](#about)
- [Installation](#installation)
- [Example](#example)
- [Compatibility with RxDB](#compatibility-with-rxdb)
- [API](#api)
  - [`Provider`](#provider)
  - [`useRxDB`](#userxdb)
  - [`useRxCollection`](#userxcollection)
  - [`useRxQuery`](#userxquery)
  - [`useRxData`](#userxdata)
  - [`useRxDocument`](#userxdocument)
- [Recipes](#recipes)
  - [Query and Query Constructor memoization](#query-and-query-constructor-memoization)
  - [Lazy instantiation of RxDatabase & RxCollections](#lazy-instantiation-of-rxdatabase--rxcollections)
  - [Mutations](#mutations)
- [LICENSE](#license)

</details>

## About

A set of simple hooks for integrating a React application with [RxDB](https://github.com/pubkey/rxdb).

Nothing fancy, just conveniently handles common use cases such as:

- subscribing to query observables and translating results into React state
- cleaning up after subscriptions where necessary
- paginating results
- maintaining useful state information (i.e. data fetching or data exhaustion during pagination)
- lazily creating or destroying collections

## Installation

```bash
# using npm
npm install rxdb-hooks

# using yarn
yarn add rxdb-hooks
```

## Example

**Root.jsx**:

```javascript
import React, { useEffect } from 'react';
import { Provider } from 'rxdb-hooks';
import initialize from './initialize';

const Root = () => {
  const [db, setDb] = useState();

  useEffect(() => {
    // RxDB instantiation can be asynchronous
    initialize().then(setDb);
  }, []);

  // Until db becomes available, consumer hooks that
  // depend on it will still work, absorbing the delay
  // by setting their state to isFetching:true
  return (
    <Provider db={db}>
      <App />
    </Provider>
  );
};
```

**Consumer.jsx**:

```javascript
import React from 'react';
import { useRxData } from 'rxdb-hooks';

const Consumer = () => {
  const { result: characters, isFetching } = useRxData(
    // the collection to be queried
    'characters',
    // a function returning the query to be applied
    collection =>
      collection.find({
        selector: {
          affiliation: 'jedi',
        },
      })
  );

  if (isFetching) {
    return 'loading characters...';
  }

  return (
    <ul>
      {characters.map((character, idx) => (
        <li key={idx}>{character.name}</li>
      ))}
    </ul>
  );
};
```

**initialize.js**:

```javascript
const initialize = async () => {
  // create RxDB
  const db = await createRxDatabase({
    name: 'test_database',
  });

  // create a collection
  const collection = await db.addCollections({
    characters: {
      schema: {
        title: 'characters',
        version: 0,
        type: 'object',
        primaryKey: 'id',
        properties: {
          id: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
        },
      },
    },
  });

  // maybe sync collection to a remote
  // ...

  return db;
};
```

## Compatibility with RxDB

The core API of rxdb-hooks remains largely the same across all major versions _beyond_ `1.x`, however some parts of the internal
implementation (most notably [the plugin](src/plugins.ts)) differ based on the version of rxdb we need to target **\***.
Please use the appropriate version of rxdb-hooks as per this table:

| rxdb-hooks version | targeted RxDB version  |
| ------------------ | ---------------------- |
| `4.1.x`            | `13.x`                 |
| `4.0.x`            | `10.x`, `11.x`, `12.x` |
| `3.x`              | `9.x`                  |
| `1.x`, `2.x`       | `8.x`                  |

_\* Versions 7.x of RxDB and below have not been tested and are not guaranteed to work with rxdb-hooks_

## API

### `Provider`

The `<Provider />` makes the RxDatabase instance available to nested components and is required for all subsequent hooks to work.

#### Props

| Property | Type         | Description                                  |
| -------- | ------------ | -------------------------------------------- |
| `db`     | `RxDatabase` | the RxDatabase instance to consume data from |

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

| Option       | Type                          | Description                                                                                                                                                                                                                                                                                                                                     |
| ------------ | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pageSize`   | `number`                      | (optional) enables pagination & defines page limit                                                                                                                                                                                                                                                                                              |
| `pagination` | `"Traditional" \| "Infinite"` | (optional) determines pagination mode: <br>`Traditional`: results are split into pages, starts by rendering the first page and total `pageCount` is returned, allowing for requesting results of any specific page. <br>`Infinite`: first page of results is rendered, allowing for gradually requesting more. <br>**Default**: `"Traditional"` |
| `json`       | `boolean`                     | (optional) when `true` resulting documents will be converted to plain JavaScript objects; equivalent to manually calling `.toJSON()` on each `RxDocument`. **Default**: `false`                                                                                                                                                                 |

#### `result: RxQueryResult<T>`

| Property      | Type                     | Description                                                                                                            |
| ------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `result`      | `T[] \| RxDocument<T>[]` | the resulting array of objects or `RxDocument` instances, depending on `json` option                                   |
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

const query = collection.find().where('affiliation').equals('Jedi');

const { result } = useRxQuery(query);
```

#### Infinite Scroll Pagination Example

```javascript
const collection = useRxCollection('characters');

const query = collection.find().where('affiliation').equals('Jedi');

const {
  result: characters,
  isFetching,
  fetchMore,
  isExhausted,
} = useRxQuery(query, {
  pageSize: 5,
  pagination: 'Infinite',
});

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

const query = collection.find({
  selector: {
    affiliation: 'jedi',
  },
});

const {
  result: characters,
  isFetching,
  fetchPage,
  pageCount,
} = useRxQuery(query, {
  pageSize: 5,
  pagination: 'Traditional',
});

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
  collection.find().where('affiliation').equals('Jedi')
);
```

<hr />

## Recipes

### Query and Query Constructor memoization

By design, `useRxQuery` will re-subscribe to `query` object whenever it changes, allowing
for query criteria to be modified during component updates. For this reason, to
avoid unnecessary re-subscriptions, query should be memoized (i.e. via react's `useMemo`):

```javascript
const { affiliation } = props;
const collection = useRxCollection('characters');

const query = useMemo(
  () =>
    collection.find({
      selector: {
        affiliation,
      },
    }),
  [collection, affiliation]
);

const { result } = useRxQuery(query);
```

Same goes for `useRxData` and the `queryConstructor` function:

```javascript
const { affiliation } = props;

const queryConstructor = useCallback(
  collection =>
    collection.find({
      selector: {
        affiliation,
      },
    }),
  [affiliation]
);

const { result } = useRxData('characters', queryConstructor);
```

### Lazy instantiation of RxDatabase & RxCollections

All rxdb-hooks give you the ability to lazily instantiate the database and the
collections within it. Initial delay until the above become available is absorbed
by indicating the state as fetching (`isFetching:true`).

Since `v5.0.0` of `rxdb-hooks`, observing newly created collections has become
an **opt-in** feature that, _if needed_, has to be enabled via the provided `observeNewCollections` plugin:

```javascript
import { addRxPlugin } from 'rxdb';
import { observeNewCollections } from 'rxdb-hooks';

addRxPlugin(observeNewCollections);
```

Adding the plugin makes it possible for all rxdb-hooks to pick up data from
collections that are lazily added after the inital db initialization.

Also note that lazily instantiating the rxdb instance itself is supported
out-of-the-box, **the plugin only affects lazy collection creation**.

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
