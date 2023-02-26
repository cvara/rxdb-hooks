import React from 'react';
import { useRxData } from '../../src';
import { Character } from '../data';

function App() {
	const { result: characters, isFetching } = useRxData<Character>(
		'characters',
		collection =>
			collection?.find({
				selector: {
					affiliation: 'Jedi',
				},
			})
	);

	if (isFetching) {
		return <div>loading characters...</div>;
	}

	return (
		<div>
			<ul>
				{characters.map((character, idx) => (
					<li key={idx}>{character.name}</li>
				))}
			</ul>
		</div>
	);
}

export default App;
