export interface Catalog {
	products: Product[];
	success: boolean;
}

export interface Product {
	id: string;
	sku: string;
	name: string;
	description: string;
	category: Category | null;
	effectiveStartDate: Date;
	effectiveEndDate: Date;
	productNumber: string;
	allowFeatureChanges: boolean;
	Entitlements__c: null | string;
	ProductEnabled__c: EnabledC | null;
	AcquisitionProfile__c: AcquisitionProfileC | null;
	ProductCode__c: ProductCodeC | null;
	ProductType__c: null | string;
	ProductLevel__c: null | string;
	Tier__c: null | string;
	productRatePlans: ProductRatePlan[];
	productFeatures: ProductFeature[];
}

export enum AcquisitionProfileC {
	Free = 'Free',
	Gift = 'Gift',
	Paid = 'Paid',
	Staff = 'Staff',
}

export enum ProductCodeC {
	Gdp = 'GDP',
}

export enum EnabledC {
	False = 'False',
	True = 'True',
}

export enum Category {
	BaseProducts = 'Base Products',
	MiscellaneousProducts = 'Miscellaneous Products',
}

export interface ProductFeature {
	id: string;
	name: string;
	code: string;
	status: Status;
	description: string;
}

export enum Status {
	Active = 'Active',
	Expired = 'Expired',
}

export interface ProductRatePlan {
	id: string;
	status: Status;
	name: string;
	description: string;
	effectiveStartDate: Date;
	effectiveEndDate: Date;
	TermType__c: TermTypeC | null;
	FrontendId__c: null | string;
	Enabled__c: EnabledC | null;
	Saving__c: null | string;
	DefaultTerm__c: null | string;
	RatePlanType__c: RatePlanTypeC | null;
	PromotionCode__c: null | string;
	TrialPeriodDays__c: null | string;
	AnalysisCode__c: null | string;
	externalIdSourceSystem: null | string;
	externallyManagedPlanIds: any[];
	productRatePlanCharges: ProductRatePlanCharge[];
	productRatePlanNumber: null | string;
}

export enum RatePlanTypeC {
	Base = 'Base',
	Promotion = 'Promotion',
}

export enum TermTypeC {
	Evergreen = 'EVERGREEN',
	Oneterm = 'ONETERM',
	Termed = 'TERMED',
}

export interface ProductRatePlanCharge {
	id: string;
	name: string;
	type: Type;
	model: Model;
	uom: Uom | null;
	pricingSummary: string[];
	pricing: Pricing[];
	defaultQuantity: number | null;
	applyDiscountTo: ApplyDiscountTo | null;
	discountLevel: DiscountLevel | null;
	discountClass: null;
	productDiscountApplyDetails: ProductDiscountApplyDetail[];
	endDateCondition: EndDateCondition;
	upToPeriods: number | null;
	upToPeriodsType: UpToPeriodsType | null;
	billingDay: BillingDay | null;
	listPriceBase: ListPriceBase | null;
	specificListPriceBase: null;
	billingTiming: BillingTiming | null;
	ratingGroup: RatingGroup | null;
	billingPeriod: BillingPeriod | null;
	billingPeriodAlignment: BillingPeriodAlignment | null;
	specificBillingPeriod: number | null;
	smoothingModel: null;
	numberOfPeriods: null;
	overageCalculationOption: null;
	overageUnusedUnitsCreditOption: null;
	unusedIncludedUnitPrice: null;
	usageRecordRatingOption: null;
	priceChangeOption: PriceChangeOption | null;
	priceIncreasePercentage: null;
	useTenantDefaultForPriceChange: boolean | null;
	taxable: boolean;
	taxCode: TaxCode | null;
	taxMode: TaxMode | null;
	prorationOption: null;
	ProductType__c: null | string;
	triggerEvent: TriggerEvent;
	description: string;
	revRecCode: null;
	revRecTriggerCondition: null;
	revenueRecognitionRuleName: RevenueRecognitionRuleName | null;
	useDiscountSpecificAccountingCode: boolean | null;
	financeInformation: FinanceInformation;
	isStackedDiscount: boolean;
	productRatePlanChargeNumber: null | string;
}

export enum ApplyDiscountTo {
	Onetimerecurringusage = 'ONETIMERECURRINGUSAGE',
	Recurring = 'RECURRING',
}

export enum BillingDay {
	ChargeTriggerDay = 'ChargeTriggerDay',
	DefaultFromCustomer = 'DefaultFromCustomer',
	SubscriptionStartDay = 'SubscriptionStartDay',
}

export enum BillingPeriod {
	Annual = 'Annual',
	Month = 'Month',
	Quarter = 'Quarter',
	SemiAnnual = 'Semi_Annual',
	SpecificWeeks = 'Specific_Weeks',
	ThreeYears = 'Three_Years',
	TwoYears = 'Two_Years',
	Week = 'Week',
}

export enum BillingPeriodAlignment {
	AlignToCharge = 'AlignToCharge',
	AlignToSubscriptionStart = 'AlignToSubscriptionStart',
	AlignToTermStart = 'AlignToTermStart',
}

export enum BillingTiming {
	InAdvance = 'IN_ADVANCE',
}

export enum DiscountLevel {
	Rateplan = 'rateplan',
	Subscription = 'subscription',
}

export enum EndDateCondition {
	FixedPeriod = 'Fixed_Period',
	OneTime = 'One_Time',
	SubscriptionEnd = 'Subscription_End',
}

export interface FinanceInformation {
	deferredRevenueAccountingCode: null | string;
	deferredRevenueAccountingCodeType: DeferredRevenueAccountingCodeType | null;
	recognizedRevenueAccountingCode: null | string;
	recognizedRevenueAccountingCodeType: RecognizedRevenueAccountingCodeType | null;
	accountsReceivableAccountingCode: AccountsReceivableAccountingCode | null;
	accountsReceivableAccountingCodeType: AccountsReceivableAccountingCodeType | null;
}

export enum AccountsReceivableAccountingCode {
	AccountsReceivable = 'Accounts Receivable',
}

export enum AccountsReceivableAccountingCodeType {
	AccountsReceivable = 'AccountsReceivable',
}

export enum DeferredRevenueAccountingCodeType {
	Cash = 'Cash',
	DeferredRevenue = 'DeferredRevenue',
	SalesRevenue = 'SalesRevenue',
}

export enum RecognizedRevenueAccountingCodeType {
	Cash = 'Cash',
	SalesDiscounts = 'SalesDiscounts',
	SalesRevenue = 'SalesRevenue',
}

export enum ListPriceBase {
	PerBillingPeriod = 'Per_Billing_Period',
}

export enum Model {
	DiscountFixedAmount = 'DiscountFixedAmount',
	DiscountPercentage = 'DiscountPercentage',
	FlatFee = 'FlatFee',
	Overage = 'Overage',
	PerUnit = 'PerUnit',
	TieredWithOverage = 'TieredWithOverage',
}

export enum PriceChangeOption {
	NoChange = 'NoChange',
	UseLatestProductCatalogPricing = 'UseLatestProductCatalogPricing',
}

export interface Pricing {
	currency: Currency;
	price: number | null;
	tiers: Tier[] | null;
	includedUnits: number | null;
	overagePrice: number | null;
	discountPercentage: number | null;
	discountAmount: number | null;
}

export enum Currency {
	Aud = 'AUD',
	CAD = 'CAD',
	Eur = 'EUR',
	Gbp = 'GBP',
	Nzd = 'NZD',
	Usd = 'USD',
}

export interface Tier {
	tier: number;
	startingUnit: number;
	endingUnit: number;
	price: number;
	priceFormat: Model;
}

export interface ProductDiscountApplyDetail {
	appliedProductRatePlanId: string;
	appliedProductRatePlanChargeId: string;
}

export enum RatingGroup {
	ByBillingPeriod = 'ByBillingPeriod',
}

export enum RevenueRecognitionRuleName {
	AutomatedTestCustomDSGiftRecognitionRule = 'Automated Test Custom DS Gift Recognition Rule',
	DigitalSubscriptionGiftRule = 'Digital Subscription Gift Rule',
	GiftRevenueRecognitionRule = 'Gift Revenue Recognition Rule',
	RecognizeDailyOverTime = 'Recognize daily over time',
	RecognizeUponInvoicing = 'Recognize upon invoicing',
}

export enum TaxCode {
	EUTaxRates2015 = 'EU Tax Rates (2015)',
	Empty = '',
	GlobalTax = 'Global Tax',
	GuardianWeekly = 'Guardian Weekly',
	HomeDelivery = 'Home Delivery',
	SupporterPlus = 'Supporter Plus',
}

export enum TaxMode {
	TaxExclusive = 'TaxExclusive',
	TaxInclusive = 'TaxInclusive',
}

export enum TriggerEvent {
	ContractEffective = 'ContractEffective',
	CustomerAcceptance = 'CustomerAcceptance',
}

export enum Type {
	OneTime = 'OneTime',
	Recurring = 'Recurring',
	Usage = 'Usage',
}

export enum Uom {
	Each = 'Each',
	GB = 'GB',
}

export enum UpToPeriodsType {
	BillingPeriods = 'Billing_Periods',
	Months = 'Months',
}
