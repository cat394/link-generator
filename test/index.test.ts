import { assertEquals } from '$std/assert/mod.ts';
import { describe, it } from 'https://deno.land/std@0.224.0/testing/bdd.ts';
import {
	createLinkGenerator,
	type FlatRoutes,
	flattenRouteConfig,
	type RouteConfig,
} from '../src/mod.ts';

const routeConfig = {
	staticRoute: {
		path: '/',
	},
	dynamicRoute: {
		path: '/dynamic',
		children: {
			depth1: {
				path: '/:param1',
				children: {
					depth2: {
						path: '/depth2/:param2',
					},
				},
			},
		},
	},
	constraintRoute: {
		path: '/constraint',
		children: {
			param: {
				path: '/param',
				children: {
					stringConstraint: {
						path: '/:param<string>',
					},
					numberConstraint: {
						path: '/:param<number>',
					},
					booleanConstraint: {
						path: '/:param<boolean>',
					},
					unionConstraint: {
						path: '/:param<(a|1|false)>',
					},
				},
			},
			searchParam: {
				path: '/searchParam',
				children: {
					stringConstraint: {
						path: '?key<string>',
					},
					numberConstraint: {
						path: '?key<number>',
					},
					booleanConstraint: {
						path: '?key<boolean>',
					},
					unionConstraint: {
						path: '?key<(a|1|false)>',
					},
				},
			},
		},
	},
	withSearchParamsRoute: {
		path: '/search',
		children: {
			singleParam: {
				path: '?key',
			},
			multiParams: {
				path: '?key1&key2',
			},
			optionalParam: {
				path: '?key1?&key2',
			},
		},
	},
	mixRoute: {
		path: '/mix',
		children: {
			signle: {
				path: '/:param1?searchParam1',
			},
			multipleParams: {
				path: '/:param2/:param3?searchParam1',
			},
			multipleSearchParams: {
				path: '/:param3?searchParam1&searchParam2',
			},
			nested: {
				path: '/nested?searchParam1',
				children: {
					depth1: {
						path: '/:param1?searchParam2',
					},
				},
			},
		},
	},
	absoluteRoute: {
		path: 'protocol://',
		children: {
			domain: {
				path: 'example.com',
				children: {
					static: {
						path: '/staticPage',
					},
					withParam: {
						path: '/:param?key',
					},
				},
			},
		},
	},
} as const satisfies RouteConfig;

const flatResult = {
	staticRoute: '/',
	dynamicRoute: '/dynamic',
	'dynamicRoute/depth1': '/dynamic/:param1',
	'dynamicRoute/depth1/depth2': '/dynamic/:param1/depth2/:param2',
	constraintRoute: '/constraint',
	'constraintRoute/param': '/constraint/param',
	'constraintRoute/param/stringConstraint': '/constraint/param/:param<string>',
	'constraintRoute/param/numberConstraint': '/constraint/param/:param<number>',
	'constraintRoute/param/booleanConstraint':
		'/constraint/param/:param<boolean>',
	'constraintRoute/param/unionConstraint':
		'/constraint/param/:param<(a|1|false)>',
	'constraintRoute/searchParam': '/constraint/searchParam',
	'constraintRoute/searchParam/stringConstraint':
		'/constraint/searchParam?key<string>',
	'constraintRoute/searchParam/numberConstraint':
		'/constraint/searchParam?key<number>',
	'constraintRoute/searchParam/booleanConstraint':
		'/constraint/searchParam?key<boolean>',
	'constraintRoute/searchParam/unionConstraint':
		'/constraint/searchParam?key<(a|1|false)>',
	withSearchParamsRoute: '/search',
	'withSearchParamsRoute/singleParam': '/search?key',
	'withSearchParamsRoute/multiParams': '/search?key1&key2',
	'withSearchParamsRoute/optionalParam': '/search?key1?&key2',
	mixRoute: '/mix',
	'mixRoute/signle': '/mix/:param1?searchParam1',
	'mixRoute/multipleParams': '/mix/:param2/:param3?searchParam1',
	'mixRoute/multipleSearchParams': '/mix/:param3?searchParam1&searchParam2',
	'mixRoute/nested': '/mix/nested?searchParam1',
	'mixRoute/nested/depth1': '/mix/nested/:param1?searchParam2',
	absoluteRoute: 'protocol://',
	'absoluteRoute/domain': 'protocol://example.com',
	'absoluteRoute/domain/static': 'protocol://example.com/staticPage',
	'absoluteRoute/domain/withParam': 'protocol://example.com/:param?key',
} as const satisfies FlatRoutes<typeof routeConfig>;

Deno.test('format function test', () => {
	const flatConfig = flattenRouteConfig(routeConfig);

	assertEquals(flatResult, flatConfig);
});

describe('generator function test', () => {
	const flatConfig = flattenRouteConfig(routeConfig);

	const link = createLinkGenerator(flatConfig);

	it('static path', () => {
		assertEquals('/', link('staticRoute'));
	});

	describe('path with params', () => {
		it('with single params', () => {
			assertEquals(
				'/dynamic/param1',
				link('dynamicRoute/depth1', { param1: 'param1' })
			);
		});

		it('with multiple params', () => {
			assertEquals(
				'/dynamic/dynamicPart1/depth2/dynamicPart2',
				link('dynamicRoute/depth1/depth2', {
					param1: 'dynamicPart1',
					param2: 'dynamicPart2',
				})
			);
		});

		describe('params with constraint field', () => {
			it('string constraint', () => {
				assertEquals(
					'/constraint/param/dynamicPart1',
					link('constraintRoute/param/stringConstraint', {
						param: 'dynamicPart1',
					})
				);
			});

			it('number constraint', () => {
				assertEquals(
					'/constraint/param/1',
					link('constraintRoute/param/numberConstraint', { param: 1 })
				);
			});

			it('boolean constraint', () => {
				assertEquals(
					'/constraint/param/true',
					link('constraintRoute/param/booleanConstraint', {
						param: true,
					})
				);
			});

			describe('Union constraint', () => {
				it('Union constraint string element', () => {
					assertEquals(
						'/constraint/param/a',
						link('constraintRoute/param/unionConstraint', {
							param: 'a',
						})
					);
				});

				it('Union constraint number element', () => {
					assertEquals(
						'/constraint/param/1',
						link('constraintRoute/param/numberConstraint', {
							param: 1,
						})
					);
				});

				it('Union constraint boolean element', () => {
					assertEquals(
						'/constraint/param/false',
						link('constraintRoute/param/unionConstraint', {
							param: false,
						})
					);
				});
			});
		});
	});

	describe('path with search params', () => {
		it('all search params have values set', () => {
			assertEquals(
				'/search?key=value',
				link('withSearchParamsRoute/singleParam', undefined, { key: 'value' })
			);
		});

		it('some search params have values set', () => {
			assertEquals(
				'/search?key1=value1&key2=value2',
				link('withSearchParamsRoute/multiParams', undefined, {
					key1: 'value1',
					key2: 'value2',
				})
			);
		});

		it('optional search param have value set', () => {
			assertEquals(
				'/search?key1=value1&key2=value2',
				link('withSearchParamsRoute/optionalParam', undefined, {
					key1: 'value1',
					key2: 'value2',
				})
			);
		});

		it('optional search param have not value set', () => {
			assertEquals(
				'/search?key2=value2',
				link('withSearchParamsRoute/optionalParam', undefined, {
					key2: 'value2',
				})
			);
		});

		it('all search params have the value undefined', () => {
			assertEquals(
				'/search',
				link('withSearchParamsRoute/multiParams', undefined)
			);
		});

		describe('search params with constraint filed', () => {
			it('string constraint', () => {
				assertEquals(
					'/constraint/searchParam?key=value',
					link('constraintRoute/searchParam/stringConstraint', undefined, {
						key: 'value',
					})
				);
			});

			it('number constraint', () => {
				assertEquals(
					'/constraint/searchParam?key=1',
					link('constraintRoute/searchParam/numberConstraint', undefined, {
						key: 1,
					})
				);
			});

			it('boolean constraint', () => {
				assertEquals(
					'/constraint/searchParam?key=true',
					link('constraintRoute/searchParam/booleanConstraint', undefined, {
						key: true,
					})
				);
			});
		});
	});

	describe('absolute path', () => {
		it('static page', () => {
			assertEquals(
				'protocol://example.com/staticPage',
				link('absoluteRoute/domain/static')
			);
		});

		it('with param and with search param', () => {
			assertEquals(
				'protocol://example.com/dynamicPage',
				link('absoluteRoute/domain/withParam', { param: 'dynamicPage' })
			);
		});

		it('with param and no search param', () => {
			assertEquals(
				'protocol://example.com/dynamicPage?key=value',
				link(
					'absoluteRoute/domain/withParam',
					{ param: 'dynamicPage' },
					{
						key: 'value',
					}
				)
			);
		});
	});
});
