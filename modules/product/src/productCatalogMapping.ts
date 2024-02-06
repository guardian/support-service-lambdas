import type { Stage } from '@modules/stage';

export const codeMapping = {
	Digital: {
		DigitalSubscription: {
			Annual: {
				productRatePlanId: '2c92c0f94bbffaaa014bc6a4212e205b',
				productRatePlanCharges: {
					Subscription: '2c92c0f94bbffaaa014bc6a4213e205d',
				},
			},
			ThreeMonthGift: {
				productRatePlanId: '2c92c0f8778bf8f60177915b477714aa',
				productRatePlanCharges: {
					Subscription: '2c92c0f9778c090d0177916fd95b47a2',
				},
			},
			OneYearGift: {
				productRatePlanId: '2c92c0f8778bf8cd0177a610cdf230ae',
				productRatePlanCharges: {
					Subscription: '2c92c0f9778c090d0177a613d98c177e',
				},
			},
			Monthly: {
				productRatePlanId: '2c92c0f84bbfec8b014bc655f4852d9d',
				productRatePlanCharges: {
					Subscription: '2c92c0f84bbfec58014bc6a2c37e1f15',
				},
			},
		},
		SupporterPlus: {
			Annual: {
				productRatePlanId: '8ad08e1a8586721801858805663f6fab',
				productRatePlanCharges: {
					Contribution: '8ad096ca858682bb0185881568385d73',
					Subscription: '8ad08e1a858672180185880566606fad',
				},
			},
			Monthly: {
				productRatePlanId: '8ad08cbd8586721c01858804e3275376',
				productRatePlanCharges: {
					Contribution: '8ad09ea0858682bb0185880ac57f4c4c',
					Subscription: '8ad08cbd8586721c01858804e3715378',
				},
			},
		},
		Contribution: {
			Annual: {
				productRatePlanId: '2c92c0f85e2d19af015e3896e824092c',
				productRatePlanCharges: {
					Contribution: '2c92c0f85e2d19af015e3896e84d092e',
				},
			},
			Monthly: {
				productRatePlanId: '2c92c0f85a6b134e015a7fcd9f0c7855',
				productRatePlanCharges: {
					Contribution: '2c92c0f85a6b1352015a7fcf35ab397c',
				},
			},
		},
	},
	Newspaper: {
		HomeDelivery: {
			Everyday: {
				productRatePlanId: '2c92c0f955c3cf0f0155c5d9e2493c43',
				productRatePlanCharges: {
					Thursday: '2c92c0f955c3cf0f0155c5d9e3233c55',
					Tuesday: '2c92c0f955c3cf0f0155c5d9e3da3c65',
					Wednesday: '2c92c0f955c3cf0f0155c5d9e37f3c5d',
					Friday: '2c92c0f955c3cf0f0155c5d9e2713c45',
					Sunday: '2c92c0f955c3cf0f0155c5d9e4993c75',
					Monday: '2c92c0f955c3cf0f0155c5d9e43a3c6d',
					Saturday: '2c92c0f955c3cf0f0155c5d9e2c83c4d',
				},
			},
			Sixday: {
				productRatePlanId: '2c92c0f955c3cf0f0155c5d9ddf13bc5',
				productRatePlanCharges: {
					Saturday: '2c92c0f955c3cf0f0155c5d9de463bcf',
					Monday: '2c92c0f955c3cf0f0155c5d9df0a3bef',
					Tuesday: '2c92c0f955c3cf0f0155c5d9ded23be7',
					Wednesday: '2c92c0f955c3cf0f0155c5d9dea63bdf',
					Thursday: '2c92c0f955c3cf0f0155c5d9de783bd7',
					Friday: '2c92c0f955c3cf0f0155c5d9de103bc7',
				},
			},
			Weekend: {
				productRatePlanId: '2c92c0f955c3cf0f0155c5d9df433bf7',
				productRatePlanCharges: {
					Sunday: '2c92c0f955c3cf0f0155c5d9df963c01',
					Saturday: '2c92c0f955c3cf0f0155c5d9df5c3bf9',
				},
			},
			Saturday: {
				productRatePlanId: '2c92c0f961f9cf300161fc4d2e3e3664',
				productRatePlanCharges: {
					Saturday: '2c92c0f961f9cf300161fc4d2e773666',
				},
			},
			Sunday: {
				productRatePlanId: '2c92c0f85aff3453015b1041dfd2317f',
				productRatePlanCharges: {
					Sunday: '2c92c0f85aff3453015b1041dfea3181',
				},
			},
		},
		NationalDelivery: {
			Everyday: {
				productRatePlanId: '8ad096ca8992481d018992a363bd17ad',
				productRatePlanCharges: {
					Sunday: '8ad096ca8992481d018992a367c518e3',
					Saturday: '8ad096ca8992481d018992a364a517f7',
					Friday: '8ad096ca8992481d018992a3640b17c4',
					Thursday: '8ad096ca8992481d018992a365741862',
					Wednesday: '8ad096ca8992481d018992a366281896',
					Tuesday: '8ad096ca8992481d018992a366c018bb',
					Monday: '8ad096ca8992481d018992a3674c18da',
				},
			},
			Weekend: {
				productRatePlanId: '8ad096ca8992481d018992a36256175e',
				productRatePlanCharges: {
					Sunday: '8ad096ca8992481d018992a36308176c',
					Saturday: '8ad096ca8992481d018992a362931760',
				},
			},
			Sixday: {
				productRatePlanId: '8ad096ca8992481d018992a35f60171b',
				productRatePlanCharges: {
					Saturday: '8ad096ca8992481d018992a3601a1729',
					Friday: '8ad096ca8992481d018992a35fa9171e',
					Wednesday: '8ad096ca8992481d018992a360ff1739',
					Tuesday: '8ad096ca8992481d018992a3616a174a',
					Monday: '8ad096ca8992481d018992a361da1756',
					Thursday: '8ad096ca8992481d018992a360911731',
				},
			},
		},
		SubscriptionCard: {
			Everyday: {
				productRatePlanId: '2c92c0f86fa49142016fa49ea56a2938',
				productRatePlanCharges: {
					Sunday: '2c92c0f86fa49142016fa49ea8a8296e',
					Saturday: '2c92c0f86fa49142016fa49ea5f12942',
					Tuesday: '2c92c0f86fa49142016fa49ea7f2295d',
					Wednesday: '2c92c0f86fa49142016fa49ea7782955',
					Thursday: '2c92c0f86fa49142016fa49ea644294a',
					Friday: '2c92c0f86fa49142016fa49ea599293a',
					Monday: '2c92c0f86fa49142016fa49ea84e2965',
				},
			},
			Weekend: {
				productRatePlanId: '2c92c0f86fa49142016fa49ea0d028b6',
				productRatePlanCharges: {
					Sunday: '2c92c0f86fa49142016fa49ea12a28c0',
					Saturday: '2c92c0f86fa49142016fa49ea0ec28b8',
				},
			},
			Sixday: {
				productRatePlanId: '2c92c0f86fa49142016fa49e9b9a286f',
				productRatePlanCharges: {
					Monday: '2c92c0f86fa49142016fa49ea07828ae',
					Tuesday: '2c92c0f86fa49142016fa49ea03d28a4',
					Wednesday: '2c92c0f86fa49142016fa49ea0072896',
					Saturday: '2c92c0f86fa49142016fa49e9eaf287f',
					Friday: '2c92c0f86fa49142016fa49e9e472877',
					Thursday: '2c92c0f86fa49142016fa49e9ee72887',
				},
			},
			Sunday: {
				productRatePlanId: '2c92c0f86fa49142016fa49eb0a42a01',
				productRatePlanCharges: {
					Sunday: '2c92c0f86fa49142016fa49eb0f42a15',
				},
			},
			Saturday: {
				productRatePlanId: '2c92c0f86fa49142016fa49ea442291b',
				productRatePlanCharges: {
					Saturday: '2c92c0f86fa49142016fa49ea4da2921',
				},
			},
		},
	},
	GuardianWeekly: {
		RestOfWorld: {
			ThreeMonthGift: {
				productRatePlanId: '2c92c0f96df75b5a016df81ba1c62609',
				productRatePlanCharges: {
					Subscription: '2c92c0f96df75b5a016df81ba1e9260b',
				},
			},
			OneYearGift: {
				productRatePlanId: '2c92c0f967caee410167eff78e7b5244',
				productRatePlanCharges: {
					Subscription: '2c92c0f967caee410167eff78e975246',
				},
			},
			SixWeekly: {
				productRatePlanId: '2c92c0f965f2122101660fbc75a16c38',
				productRatePlanCharges: {
					Subscription: '2c92c0f965f2122101660fbc75ba6c3c',
				},
			},
			Quarterly: {
				productRatePlanId: '2c92c0f965f2122101660fb81b745a06',
				productRatePlanCharges: {
					Subscription: '2c92c0f965f2122101660fb81b875a0b',
				},
			},
			Annual: {
				productRatePlanId: '2c92c0f965f2122101660fb33ed24a45',
				productRatePlanCharges: {
					Subscription: '2c92c0f965f2122101660fb6ac46550e',
				},
			},
			Monthly: {
				productRatePlanId: '2c92c0f878ac402c0178acb3a90a3620',
				productRatePlanCharges: {
					Monthly: '2c92c0f878ac402c0178acf675822d88',
				},
			},
		},
		Domestic: {
			ThreeMonthGift: {
				productRatePlanId: '2c92c0f96ded216a016df491134d4091',
				productRatePlanCharges: {
					Subscription: '2c92c0f96ded216a016df49113814093',
				},
			},
			SixWeekly: {
				productRatePlanId: '2c92c0f965f212210165f69b94c92d66',
				productRatePlanCharges: {
					Subscription: '2c92c0f865f204440165f69f407d66f1',
				},
			},
			Quarterly: {
				productRatePlanId: '2c92c0f965dc30640165f150c0956859',
				productRatePlanCharges: {
					Subscription: '2c92c0f865d273010165f16ada0a4346',
				},
			},
			Annual: {
				productRatePlanId: '2c92c0f965d280590165f16b1b9946c2',
				productRatePlanCharges: {
					Subscription: '2c92c0f965d280590165f16b1ba946c4',
				},
			},
			Monthly: {
				productRatePlanId: '2c92c0f878ac40300178acaa04bb401d',
				productRatePlanCharges: {
					Subscription: '2c92c0f878ac40300178acae0612681b',
				},
			},
			OneYearGift: {
				productRatePlanId: '2c92c0f867cae0700167eff921734f7b',
				productRatePlanCharges: {
					Subscription: '2c92c0f867cae0700167eff921884f7d',
				},
			},
		},
	},
};

export const prodMapping = {
	Digital: {
		DigitalSubscription: {
			Monthly: {
				productRatePlanId: '2c92a0fb4edd70c8014edeaa4eae220a',
				productRatePlanCharges: {
					Subscription: '2c92a0fb4edd70c9014edeaa50342192',
				},
			},
			Annual: {
				productRatePlanId: '2c92a0fb4edd70c8014edeaa4e972204',
				productRatePlanCharges: {
					Subscription: '2c92a0fb4edd70c9014edeaa5001218c',
				},
			},
			ThreeMonthGift: {
				productRatePlanId: '2c92a00d779932ef0177a65430d30ac1',
				productRatePlanCharges: {
					Subscription: '2c92a00f779933030177a65881490325',
				},
			},
			OneYearGift: {
				productRatePlanId: '2c92a00c77992ba70177a6596f710265',
				productRatePlanCharges: {
					Subscription: '2c92a011779932fd0177a670f43102aa',
				},
			},
		},
		SupporterPlus: {
			Monthly: {
				productRatePlanId: '8a128ed885fc6ded018602296ace3eb8',
				productRatePlanCharges: {
					Contribution: '8a128d7085fc6dec01860234cd075270',
					Subscription: '8a128ed885fc6ded018602296af13eba',
				},
			},
			Annual: {
				productRatePlanId: '8a128ed885fc6ded01860228f77e3d5a',
				productRatePlanCharges: {
					Subscription: '8a128ed885fc6ded01860228f7cb3d5f',
					Contribution: '8a12892d85fc6df4018602451322287f',
				},
			},
		},
		Contribution: {
			Annual: {
				productRatePlanId: '2c92a0fc5e1dc084015e37f58c200eea',
				productRatePlanCharges: {
					Contribution: '2c92a0fc5e1dc084015e37f58c7b0f34',
				},
			},
			Monthly: {
				productRatePlanId: '2c92a0fc5aacfadd015ad24db4ff5e97',
				productRatePlanCharges: {
					Contribution: '2c92a0fc5aacfadd015ad250bf2c6d38',
				},
			},
		},
	},
	Newspaper: {
		NationalDelivery: {
			Sixday: {
				productRatePlanId: '8a12999f8a268c57018a27ebfd721883',
				productRatePlanCharges: {
					Saturday: '8a12999f8a268c57018a27ec029418ea',
					Friday: '8a12999f8a268c57018a27ebfecb18c7',
					Thursday: '8a12999f8a268c57018a27ebffb518cf',
					Wednesday: '8a12999f8a268c57018a27ebfde818ab',
					Tuesday: '8a12999f8a268c57018a27ec01a918e2',
					Monday: '8a12999f8a268c57018a27ec00b418d9',
				},
			},
			Weekend: {
				productRatePlanId: '8a12999f8a268c57018a27ebe868150c',
				productRatePlanCharges: {
					Sunday: '8a12999f8a268c57018a27ebe8b4150e',
					Saturday: '8a12999f8a268c57018a27ebe949151d',
				},
			},
			Everyday: {
				productRatePlanId: '8a12999f8a268c57018a27ebe31414a4',
				productRatePlanCharges: {
					Sunday: '8a12999f8a268c57018a27ebe35114a6',
					Saturday: '8a12999f8a268c57018a27ebe65914de',
					Friday: '8a12999f8a268c57018a27ebe44c14b6',
					Thursday: '8a12999f8a268c57018a27ebe4d414bf',
					Wednesday: '8a12999f8a268c57018a27ebe3ce14ae',
					Tuesday: '8a12999f8a268c57018a27ebe5d814d6',
					Monday: '8a12999f8a268c57018a27ebe55814ca',
				},
			},
		},
		SubscriptionCard: {
			Everyday: {
				productRatePlanId: '2c92a00870ec598001710740c78d2f13',
				productRatePlanCharges: {
					Thursday: '2c92a00870ec598001710740c8c42f40',
					Friday: '2c92a00870ec598001710740c91d2f4d',
					Monday: '2c92a00870ec598001710740c7b82f1c',
					Tuesday: '2c92a00870ec598001710740c80f2f26',
					Saturday: '2c92a00870ec598001710740c8652f37',
					Wednesday: '2c92a00870ec598001710740c9802f59',
					Sunday: '2c92a00870ec598001710740c9d72f61',
				},
			},
			Weekend: {
				productRatePlanId: '2c92a00870ec598001710740d24b3022',
				productRatePlanCharges: {
					Saturday: '2c92a00870ec598001710740d28e3024',
					Sunday: '2c92a00870ec598001710740d325302c',
				},
			},
			Sixday: {
				productRatePlanId: '2c92a00870ec598001710740ca532f69',
				productRatePlanCharges: {
					Thursday: '2c92a00870ec598001710740cc9b2f88',
					Wednesday: '2c92a00870ec598001710740cd012f90',
					Saturday: '2c92a00870ec598001710740cd6e2fa2',
					Friday: '2c92a00870ec598001710740cb4e2f6b',
					Monday: '2c92a00870ec598001710740cbb32f77',
					Tuesday: '2c92a00870ec598001710740cc2c2f80',
				},
			},
			Sunday: {
				productRatePlanId: '2c92a00870ec598001710740d0d83017',
				productRatePlanCharges: {
					Sunday: '2c92a00870ec598001710740d1103019',
				},
			},
			Saturday: {
				productRatePlanId: '2c92a00870ec598001710740cdd02fbd',
				productRatePlanCharges: {
					Saturday: '2c92a00870ec598001710740ce042fcb',
				},
			},
		},
		HomeDelivery: {
			Sixday: {
				productRatePlanId: '2c92a0ff560d311b0156136f2afe5315',
				productRatePlanCharges: {
					Wednesday: '2c92a0ff560d311b0156136f2b185317',
					Friday: '2c92a0ff560d311b0156136f2b50531f',
					Thursday: '2c92a0ff560d311b0156136f2b8c5327',
					Monday: '2c92a0ff560d311b0156136f2bc2532f',
					Tuesday: '2c92a0ff560d311b0156136f2c015337',
					Saturday: '2c92a0ff560d311b0156136f2c43533f',
				},
			},
			Everyday: {
				productRatePlanId: '2c92a0fd560d13880156136b72e50f0c',
				productRatePlanCharges: {
					Sunday: '2c92a0fd560d13230156137061435de7',
					Wednesday: '2c92a0fd560d13880156136b730d0f0e',
					Friday: '2c92a0fd560d13880156136b73770f1e',
					Thursday: '2c92a0fd560d13880156136b73b50f26',
					Monday: '2c92a0fd560d13880156136b74340f36',
					Tuesday: '2c92a0fd560d13880156136b74780f3f',
					Saturday: '2c92a0fd560d13880156136b74b80f47',
				},
			},
			Weekend: {
				productRatePlanId: '2c92a0fd5614305c01561dc88f3275be',
				productRatePlanCharges: {
					Sunday: '2c92a0fd5614305c01561dc88f8975c8',
					Saturday: '2c92a0fd5614305c01561dc88fb875d0',
				},
			},
			Sunday: {
				productRatePlanId: '2c92a0ff5af9b657015b0fea5b653f81',
				productRatePlanCharges: {
					Sunday: '2c92a0ff5af9b657015b0fea5bb83fa8',
				},
			},
			Saturday: {
				productRatePlanId: '2c92a0fd5e1dcf0d015e3cb39d0a7ddb',
				productRatePlanCharges: {
					Saturday: '2c92a0fd5e1dcf0d015e3cb39d207ddf',
				},
			},
		},
	},
	GuardianWeekly: {
		RestOfWorld: {
			Monthly: {
				productRatePlanId: '2c92a0ff79ac64e30179ae45669b3a83',
				productRatePlanCharges: {
					Monthly: '2c92a0ff79ac64e30179ae4566cb3a86',
				},
			},
			OneYearGift: {
				productRatePlanId: '2c92a0ff67cebd140167f0a2f66a12eb',
				productRatePlanCharges: {
					Subscription: '2c92a0ff67cebd140167f0a2f68912ed',
				},
			},
			Annual: {
				productRatePlanId: '2c92a0fe6619b4b601661ab300222651',
				productRatePlanCharges: {
					Subscription: '2c92a0fe6619b4b601661ab3002f2653',
				},
			},
			SixWeekly: {
				productRatePlanId: '2c92a0086619bf8901661ab545f51b21',
				productRatePlanCharges: {
					Subscription: '2c92a0086619bf8901661ab546091b23',
				},
			},
			Quarterly: {
				productRatePlanId: '2c92a0086619bf8901661ab02752722f',
				productRatePlanCharges: {
					Subscription: '2c92a0ff6619bf8b01661ab2d0396eb2',
				},
			},
			ThreeMonthGift: {
				productRatePlanId: '2c92a0076dd9892e016df8503e7c6c48',
				productRatePlanCharges: {
					Subscription: '2c92a0076dd9892e016df8503e936c4a',
				},
			},
		},
		Domestic: {
			OneYearGift: {
				productRatePlanId: '2c92a0ff67cebd0d0167f0a1a834234e',
				productRatePlanCharges: {
					Subscription: '2c92a0ff67cebd0d0167f0a1a85b2350',
				},
			},
			Annual: {
				productRatePlanId: '2c92a0fe6619b4b901661aa8e66c1692',
				productRatePlanCharges: {
					Subscription: '2c92a0fe6619b4b901661aa8e6811695',
				},
			},
			Quarterly: {
				productRatePlanId: '2c92a0fe6619b4b301661aa494392ee2',
				productRatePlanCharges: {
					Subscription: '2c92a0fe6619b4b601661aa8b74e623f',
				},
			},
			Monthly: {
				productRatePlanId: '2c92a0fd79ac64b00179ae3f9d474960',
				productRatePlanCharges: {
					Subscription: '2c92a0fd79ac64b00179ae3f9d704962',
				},
			},
			ThreeMonthGift: {
				productRatePlanId: '2c92a00e6dd988e2016df85387417498',
				productRatePlanCharges: {
					Subscription: '2c92a00e6dd988e2016df853875d74c6',
				},
			},
			SixWeekly: {
				productRatePlanId: '2c92a0086619bf8901661aaac94257fe',
				productRatePlanCharges: {
					Subscription: '2c92a0086619bf8901661aaac95d5800',
				},
			},
		},
	},
};
const mappingsForStage = (stage: Stage) =>
	stage === 'CODE' ? codeMapping : prodMapping;

type ProductFamilyKey = keyof typeof prodMapping;
type ZuoraProductKey<PF extends ProductFamilyKey> =
	keyof (typeof prodMapping)[PF];
type ProductRatePlanKey<
	PF extends ProductFamilyKey,
	ZP extends ZuoraProductKey<PF>,
> = keyof (typeof prodMapping)[PF][ZP];

type ProductRatePlanObject = { productRatePlanId: string };

export const getProductRatePlanId = <
	P extends ProductFamilyKey,
	ZP extends ZuoraProductKey<P>,
	PRP extends ProductRatePlanKey<P, ZP>,
>(
	stage: Stage,
	productFamily: P,
	zuoraProduct: ZP,
	productRatePlan: PRP,
) => {
	const productRatePlanObject = mappingsForStage(stage)[productFamily][
		zuoraProduct
	][productRatePlan] as ProductRatePlanObject;
	return productRatePlanObject.productRatePlanId;
};

export const getAllProductDetails = (stage: Stage) => {
	const stageMapping = mappingsForStage(stage);
	const keys = Object.keys(stageMapping) as Array<keyof typeof stageMapping>;
	return keys.flatMap((productFamily) => {
		const productFamilyObject = stageMapping[productFamily];
		const zuoraProductKeys = Object.keys(productFamilyObject) as Array<
			keyof typeof productFamilyObject
		>;
		return zuoraProductKeys.flatMap((zuoraProduct) => {
			const zuoraProductObject = productFamilyObject[zuoraProduct];
			const productRatePlanKeys = Object.keys(zuoraProductObject) as Array<
				keyof typeof zuoraProductObject
			>;
			return productRatePlanKeys.flatMap((productRatePlan) => {
				const productRatePlanId = getProductRatePlanId(
					stage,
					productFamily,
					zuoraProduct,
					productRatePlan,
				);
				return {
					productFamily,
					zuoraProduct,
					productRatePlan,
					productRatePlanId: productRatePlanId,
				};
			});
		});
	});
};
export const findProductDetails = (stage: Stage, productRatePlanId: string) => {
	const allProducts = getAllProductDetails(stage);
	return allProducts.find(
		(product) => product.productRatePlanId === productRatePlanId,
	);
};
