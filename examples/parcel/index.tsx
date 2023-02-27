import React, { useEffect, useState } from 'react';
import { render } from 'react-dom';
import { RxDatabase } from 'rxdb';
import { Provider } from '../../src';
import initialize from '../initialize';
import App from './App';

const Root = () => {
	const [db, setDb] = useState<RxDatabase>();

	useEffect(() => {
		initialize().then(setDb);
	}, []);

	return (
		<Provider db={db}>
			<App />
		</Provider>
	);
};

render(<Root />, document.getElementById('root'));
