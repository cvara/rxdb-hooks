export type Character = {
	id: string;
	name: string;
	affiliation: string;
	age: number;
};

export const characters = [
	{
		id: '1',
		name: 'Darth Vader',
		affiliation: 'Sith',
		age: 30,
	},
	{
		id: '2',
		name: 'Yoda',
		affiliation: 'Jedi',
		age: 900,
	},
	{
		id: '3',
		name: 'Darth Sidius',
		affiliation: 'Sith',
		age: 65,
	},
	{
		id: '4',
		name: 'Obi-Wan Kenobi',
		affiliation: 'Jedi',
		age: 68,
	},
	{
		id: '5',
		name: 'Qui-Gon Jin',
		affiliation: 'Jedi',
		age: 38,
	},
];
