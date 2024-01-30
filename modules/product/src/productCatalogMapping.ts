import type { Stage } from '@modules/stage';

const codeMapping = {
	Digital: {
		DigitalSubscription: {
			Monthly: {
				productRatePlanId: '2c92c0f84bbfec8b014bc655f4852d9d',
			},
			Annual: {
				productRatePlanId: '2c92c0f94bbffaaa014bc6a4212e205b',
			},
			OneYearGift: {
				productRatePlanId: '2c92c0f8778bf8cd0177a610cdf230ae',
			},
			ThreeMonthGift: {
				productRatePlanId: '2c92c0f8778bf8f60177915b477714aa',
			},
		},
		SupporterPlus: {
			Monthly: {
				productRatePlanId: '8ad08cbd8586721c01858804e3275376',
			},
			Annual: {
				productRatePlanId: '8ad08e1a8586721801858805663f6fab',
			},
		},
		Contribution: {
			Monthly: {
				productRatePlanId: '2c92c0f85a6b134e015a7fcd9f0c7855',
			},
			Annual: {
				productRatePlanId: '2c92c0f85e2d19af015e3896e824092c',
			},
		},
	},
	GuardianWeekly: {
		RestOfWorld: {
			Annual: {
				productRatePlanId: '2c92c0f965f2122101660fb33ed24a45',
			},
			Quarterly: {
				productRatePlanId: '2c92c0f965f2122101660fb81b745a06',
			},
			SixWeekly: {
				productRatePlanId: '2c92c0f965f2122101660fbc75a16c38',
			},
			Monthly: {
				productRatePlanId: '2c92c0f878ac402c0178acb3a90a3620',
			},
			OneYearGift: {
				productRatePlanId: '2c92c0f967caee410167eff78e7b5244',
			},
			ThreeMonthGift: {
				productRatePlanId: '2c92c0f96df75b5a016df81ba1c62609',
			},
		},
		Domestic: {
			Annual: {
				productRatePlanId: '2c92c0f965d280590165f16b1b9946c2',
			},
			Quarterly: {
				productRatePlanId: '2c92c0f965dc30640165f150c0956859',
			},
			SixWeekly: {
				productRatePlanId: '2c92c0f965f212210165f69b94c92d66',
			},
			Monthly: {
				productRatePlanId: '2c92c0f878ac40300178acaa04bb401d',
			},
			OneYearGift: {
				productRatePlanId: '2c92c0f867cae0700167eff921734f7b',
			},
			ThreeMonthGift: {
				productRatePlanId: '2c92c0f96ded216a016df491134d4091',
			},
		},
	},
	Newspaper: {
		NationalDelivery: {
			Everyday: {
				productRatePlanId: '8ad096ca8992481d018992a363bd17ad',
			},
			Sixday: {
				productRatePlanId: '8ad096ca8992481d018992a35f60171b',
			},
			Weekend: {
				productRatePlanId: '8ad096ca8992481d018992a36256175e',
			},
		},
		HomeDelivery: {
			Everyday: {
				productRatePlanId: '2c92c0f955c3cf0f0155c5d9e2493c43',
			},
			Sixday: {
				productRatePlanId: '2c92c0f955c3cf0f0155c5d9ddf13bc5',
			},
			Weekend: {
				productRatePlanId: '2c92c0f955c3cf0f0155c5d9df433bf7',
			},
			Sunday: {
				productRatePlanId: '2c92c0f85aff3453015b1041dfd2317f',
			},
			Saturday: {
				productRatePlanId: '2c92c0f961f9cf300161fc4d2e3e3664',
			},
		},
		SubscriptionCard: {
			Everyday: {
				productRatePlanId: '2c92c0f86fa49142016fa49ea56a2938',
			},
			Sixday: {
				productRatePlanId: '2c92c0f86fa49142016fa49e9b9a286f',
			},
			Weekend: {
				productRatePlanId: '2c92c0f86fa49142016fa49ea0d028b6',
			},
			Sunday: {
				productRatePlanId: '2c92c0f86fa49142016fa49ea90e2976',
			},
			Saturday: {
				productRatePlanId: '2c92c0f86fa49142016fa49eb1732a39',
			},
		},
	},
};

const prodMapping = {
	Digital: {
		DigitalSubscription: {
			Monthly: {
				productRatePlanId: '2c92a0fb4edd70c8014edeaa4eae220a',
			},
			Annual: {
				productRatePlanId: '2c92a0fb4edd70c8014edeaa4e972204',
			},
			OneYearGift: {
				productRatePlanId: '2c92a00c77992ba70177a6596f710265',
			},
			ThreeMonthGift: {
				productRatePlanId: '2c92a00d779932ef0177a65430d30ac1',
			},
		},
		SupporterPlus: {
			Monthly: {
				productRatePlanId: '8a128ed885fc6ded018602296ace3eb8',
			},
			Annual: {
				productRatePlanId: '8a128ed885fc6ded01860228f77e3d5a',
			},
		},
		Contribution: {
			Monthly: {
				productRatePlanId: '2c92a0fc5aacfadd015ad24db4ff5e97',
			},
			Annual: {
				productRatePlanId: '2c92a0fc5e1dc084015e37f58c200eea',
			},
		},
	},
	GuardianWeekly: {
		RestOfWorld: {
			Annual: {
				productRatePlanId: '2c92a0fe6619b4b601661ab300222651',
			},
			Quarterly: {
				productRatePlanId: '2c92a0086619bf8901661ab02752722f',
			},
			SixWeekly: {
				productRatePlanId: '2c92a0086619bf8901661ab545f51b21',
			},
			Monthly: {
				productRatePlanId: '2c92a0ff79ac64e30179ae45669b3a83',
			},
			OneYearGift: {
				productRatePlanId: '2c92a0ff67cebd140167f0a2f66a12eb',
			},
			ThreeMonthGift: {
				productRatePlanId: '2c92a0076dd9892e016df8503e7c6c48',
			},
		},
		Domestic: {
			Annual: {
				productRatePlanId: '2c92a0fe6619b4b901661aa8e66c1692',
			},
			Quarterly: {
				productRatePlanId: '2c92a0fe6619b4b301661aa494392ee2',
			},
			SixWeekly: {
				productRatePlanId: '2c92a0086619bf8901661aaac94257fe',
			},
			Monthly: {
				productRatePlanId: '2c92a0fd79ac64b00179ae3f9d474960',
			},
			OneYearGift: {
				productRatePlanId: '2c92a0ff67cebd0d0167f0a1a834234e',
			},
			ThreeMonthGift: {
				productRatePlanId: '2c92a00e6dd988e2016df85387417498',
			},
		},
	},
	Newspaper: {
		NationalDelivery: {
			Everyday: {
				productRatePlanId: '8a12999f8a268c57018a27ebe31414a4',
			},
			Sixday: {
				productRatePlanId: '8a12999f8a268c57018a27ebfd721883',
			},
			Weekend: {
				productRatePlanId: '8a12999f8a268c57018a27ebe868150c',
			},
		},
		HomeDelivery: {
			Everyday: {
				productRatePlanId: '2c92a0fd560d13880156136b72e50f0c',
			},
			Sixday: {
				productRatePlanId: '2c92a0ff560d311b0156136f2afe5315',
			},
			Weekend: {
				productRatePlanId: '2c92a0fd5614305c01561dc88f3275be',
			},
			Sunday: {
				productRatePlanId: '2c92a0ff5af9b657015b0fea5b653f81',
			},
			Saturday: {
				productRatePlanId: '2c92a0fd5e1dcf0d015e3cb39d0a7ddb',
			},
		},
		SubscriptionCard: {
			Everyday: {
				productRatePlanId: '2c92a00870ec598001710740c78d2f13',
			},
			Sixday: {
				productRatePlanId: '2c92a00870ec598001710740ca532f69',
			},
			Weekend: {
				productRatePlanId: '2c92a00870ec598001710740d24b3022',
			},
			Sunday: {
				productRatePlanId: '2c92a00870ec598001710740d0d83017',
			},
			Saturday: {
				productRatePlanId: '2c92a00870ec598001710740cdd02fbd',
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
