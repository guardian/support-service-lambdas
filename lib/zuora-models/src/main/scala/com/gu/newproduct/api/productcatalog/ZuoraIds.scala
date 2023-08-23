package com.gu.newproduct.api.productcatalog

import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.util.config.Stage

object ZuoraIds {

  case class ProductRatePlanId(value: String) extends AnyVal

  case class ProductRatePlanChargeId(value: String) extends AnyVal

  trait HasPlanAndChargeIds {
    val productRatePlanId: ProductRatePlanId
    val productRatePlanChargeId: ProductRatePlanChargeId
  }

  case class PlanAndCharge(productRatePlanId: ProductRatePlanId, productRatePlanChargeId: ProductRatePlanChargeId)
      extends HasPlanAndChargeIds

  case class PlanAndCharges(
      productRatePlanId: ProductRatePlanId,
      productRatePlanChargeId: ProductRatePlanChargeId,
      contributionProductRatePlanChargeId: ProductRatePlanChargeId,
  ) extends HasPlanAndChargeIds

  case class SupporterPlusZuoraIds(
      monthly: PlanAndCharge,
      monthlyV2: PlanAndCharges,
      annual: PlanAndCharge,
      annualV2: PlanAndCharges,
  ) {
    val planAndChargeByApiPlanId: Map[PlanId, PlanAndCharges] = Map(
      MonthlySupporterPlus -> monthlyV2,
      AnnualSupporterPlus -> annualV2,
    )
  }

  case class ContributionsZuoraIds(monthly: PlanAndCharge, annual: PlanAndCharge) {
    val planAndChargeByApiPlanId: Map[PlanId, PlanAndCharge] = Map(
      MonthlyContribution -> monthly,
      AnnualContribution -> annual,
    )
  }

  case class VoucherZuoraIds(
      everyday: ProductRatePlanId,
      saturday: ProductRatePlanId,
      sunday: ProductRatePlanId,
      weekend: ProductRatePlanId,
      sixDay: ProductRatePlanId,
      everydayPlus: ProductRatePlanId,
      saturdayPlus: ProductRatePlanId,
      sundayPlus: ProductRatePlanId,
      weekendPlus: ProductRatePlanId,
      sixDayPlus: ProductRatePlanId,
  ) {

    val byApiPlanId: Map[PlanId, ProductRatePlanId] = Map(
      VoucherEveryDay -> everyday,
      VoucherWeekend -> weekend,
      VoucherSixDay -> sixDay,
      VoucherSunday -> sunday,
      VoucherSaturday -> saturday,
      VoucherEveryDayPlus -> everydayPlus,
      VoucherWeekendPlus -> weekendPlus,
      VoucherSixDayPlus -> sixDayPlus,
      VoucherSundayPlus -> sundayPlus,
      VoucherSaturdayPlus -> saturdayPlus,
    )

  }

  case class HomeDeliveryZuoraIds(
      everyday: ProductRatePlanId,
      everydayPlus: ProductRatePlanId,
      saturday: ProductRatePlanId,
      saturdayPlus: ProductRatePlanId,
      sunday: ProductRatePlanId,
      sundayPlus: ProductRatePlanId,
      weekend: ProductRatePlanId,
      weekendPlus: ProductRatePlanId,
      sixDay: ProductRatePlanId,
      sixDayPlus: ProductRatePlanId,
  ) {
    val byApiPlanId: Map[PlanId, ProductRatePlanId] = Map(
      HomeDeliveryEveryDay -> everyday,
      HomeDeliveryWeekend -> weekend,
      HomeDeliverySixDay -> sixDay,
      HomeDeliverySaturday -> saturday,
      HomeDeliverySaturdayPlus -> saturdayPlus,
      HomeDeliverySunday -> sunday,
      HomeDeliveryEveryDayPlus -> everydayPlus,
      HomeDeliveryWeekendPlus -> weekendPlus,
      HomeDeliverySixDayPlus -> sixDayPlus,
      HomeDeliverySundayPlus -> sundayPlus,
    )

  }

  case class DigipackZuoraIds(
      monthly: ProductRatePlanId,
      annual: ProductRatePlanId,
  ) {
    val byApiPlanId = Map(
      DigipackAnnual -> annual,
      DigipackMonthly -> monthly,
    )
  }

  case class GuardianWeeklyDomesticIds(
      sixForSix: PlanAndCharge,
      quarterly: ProductRatePlanId,
      annual: ProductRatePlanId,
  ) {
    val zuoraRatePlanIdByApiPlanId = Map(
      GuardianWeeklyDomestic6for6 -> sixForSix.productRatePlanId,
      GuardianWeeklyDomesticQuarterly -> quarterly,
      GuardianWeeklyDomesticAnnual -> annual,
    )
    val zuoraRatePlanIdToApiPlanId = zuoraRatePlanIdByApiPlanId.map(_.swap)
    val planAndChargeByApiPlanId = Map(
      GuardianWeeklyDomestic6for6 -> sixForSix,
    )
  }

  case class GuardianWeeklyROWIds(
      sixForSix: PlanAndCharge,
      quarterly: ProductRatePlanId,
      annual: ProductRatePlanId,
  ) {
    val zuoraRatePlanIdByApiPlanId = Map(
      GuardianWeeklyROW6for6 -> sixForSix.productRatePlanId,
      GuardianWeeklyROWQuarterly -> quarterly,
      GuardianWeeklyROWAnnual -> annual,
    )
    val apiPlanIdZuoraRatePlanIdBy = zuoraRatePlanIdByApiPlanId.map(_.swap)
    val planAndChargeByApiPlanId = Map(
      GuardianWeeklyROW6for6 -> sixForSix,
    )
  }

  case class DigitalVoucherZuoraIds(
      everyday: ProductRatePlanId,
      saturday: ProductRatePlanId,
      sunday: ProductRatePlanId,
      weekend: ProductRatePlanId,
      sixDay: ProductRatePlanId,
      everydayPlus: ProductRatePlanId,
      saturdayPlus: ProductRatePlanId,
      sundayPlus: ProductRatePlanId,
      weekendPlus: ProductRatePlanId,
      sixDayPlus: ProductRatePlanId,
  ) {
    val byApiPlanId: Map[PlanId, ProductRatePlanId] = Map(
      DigitalVoucherEveryday -> everyday,
      DigitalVoucherWeekend -> weekend,
      DigitalVoucherSixday -> sixDay,
      DigitalVoucherSaturday -> saturday,
      DigitalVoucherSunday -> sunday,
      DigitalVoucherEverydayPlus -> everydayPlus,
      DigitalVoucherWeekendPlus -> weekendPlus,
      DigitalVoucherSixdayPlus -> sixDayPlus,
      DigitalVoucherSaturdayPlus -> saturdayPlus,
      DigitalVoucherSundayPlus -> sundayPlus,
    )

  }

  case class NationalDeliveryZuoraIds(
    everyday: ProductRatePlanId,
    weekend: ProductRatePlanId,
    sixDay: ProductRatePlanId,
  ) {
    val byApiPlanId: Map[PlanId, ProductRatePlanId] = Map(
      NationalDeliveryEveryday -> everyday,
      NationalDeliveryWeekend -> weekend,
      NationalDeliverySixday -> sixDay,
    )
  }

  case class ZuoraIds(
    supporterPlusZuoraIds: SupporterPlusZuoraIds,
    contributionsZuoraIds: ContributionsZuoraIds,
    voucherZuoraIds: VoucherZuoraIds,
    homeDeliveryZuoraIds: HomeDeliveryZuoraIds,
    digitalPackIds: DigipackZuoraIds,
    guardianWeeklyDomestic: GuardianWeeklyDomesticIds,
    guardianWeeklyROW: GuardianWeeklyROWIds,
    digitalVoucher: DigitalVoucherZuoraIds,
    nationalDeliveryZuoraIds: NationalDeliveryZuoraIds,
  ) {
    def apiIdToRateplanId: Map[PlanId, ProductRatePlanId] =
      (supporterPlusZuoraIds.planAndChargeByApiPlanId.view.mapValues(_.productRatePlanId) ++
        contributionsZuoraIds.planAndChargeByApiPlanId.view.mapValues(_.productRatePlanId) ++
        voucherZuoraIds.byApiPlanId ++
        homeDeliveryZuoraIds.byApiPlanId ++
        digitalPackIds.byApiPlanId ++
        guardianWeeklyDomestic.zuoraRatePlanIdByApiPlanId ++
        guardianWeeklyROW.zuoraRatePlanIdByApiPlanId ++
        digitalVoucher.byApiPlanId ++ 
        nationalDeliveryZuoraIds.byApiPlanId
      ).toMap

    val rateplanIdToApiId: Map[ProductRatePlanId, PlanId] = apiIdToRateplanId.map(_.swap)

    def apiIdToPlanAndCharge: Map[PlanId, HasPlanAndChargeIds] =
      supporterPlusZuoraIds.planAndChargeByApiPlanId ++
        contributionsZuoraIds.planAndChargeByApiPlanId ++
        guardianWeeklyDomestic.planAndChargeByApiPlanId ++
        guardianWeeklyROW.planAndChargeByApiPlanId

  }

  def zuoraIdsForStage(stage: Stage): Either[String, ZuoraIds] = {
    val mappings = Map(
      // todo ideally we should add an id to the fields in zuora so we don't have to hard code
      Stage("PROD") -> ZuoraIds(
        SupporterPlusZuoraIds(
          // Can be deleted after migration of existing subs to V2 - needed until then for cancellations
          monthly = PlanAndCharge(
            productRatePlanId = ProductRatePlanId("8a12865b8219d9b401822106192b64dc"),
            productRatePlanChargeId = ProductRatePlanChargeId("8a12865b8219d9b401822106194e64e3"),
          ),
          monthlyV2 = PlanAndCharges(
            productRatePlanId = ProductRatePlanId("8a128ed885fc6ded018602296ace3eb8"),
            productRatePlanChargeId = ProductRatePlanChargeId("8a128ed885fc6ded018602296af13eba"),
            contributionProductRatePlanChargeId = ProductRatePlanChargeId("8a128d7085fc6dec01860234cd075270"),
          ),
          // Can be deleted after migration of existing subs to V2 - needed until then for cancellations
          annual = PlanAndCharge(
            productRatePlanId = ProductRatePlanId("8a12865b8219d9b40182210618a464ba"),
            productRatePlanChargeId = ProductRatePlanChargeId("8a12865b8219d9b40182210618c664c1"),
          ),
          annualV2 = PlanAndCharges(
            productRatePlanId = ProductRatePlanId("8a128ed885fc6ded01860228f77e3d5a"),
            productRatePlanChargeId = ProductRatePlanChargeId("8a128ed885fc6ded01860228f7cb3d5f"),
            contributionProductRatePlanChargeId = ProductRatePlanChargeId("8a12892d85fc6df4018602451322287f"),
          ),
        ),
        ContributionsZuoraIds(
          monthly = PlanAndCharge(
            ProductRatePlanId("2c92a0fc5aacfadd015ad24db4ff5e97"),
            ProductRatePlanChargeId("2c92a0fc5aacfadd015ad250bf2c6d38"),
          ),
          annual = PlanAndCharge(
            ProductRatePlanId("2c92a0fc5e1dc084015e37f58c200eea"),
            ProductRatePlanChargeId("2c92a0fc5e1dc084015e37f58c7b0f34"),
          ),
        ),
        VoucherZuoraIds(
          everyday = ProductRatePlanId("2c92a0fd56fe270b0157040dd79b35da"),
          sunday = ProductRatePlanId("2c92a0fe5af9a6b9015b0fe1ecc0116c"),
          saturday = ProductRatePlanId("2c92a0fd6205707201621f9f6d7e0116"),
          weekend = ProductRatePlanId("2c92a0ff56fe33f00157040f9a537f4b"),
          sixDay = ProductRatePlanId("2c92a0fd56fe270b0157040e42e536ef"),
          everydayPlus = ProductRatePlanId("2c92a0ff56fe33f50157040bbdcf3ae4"),
          sundayPlus = ProductRatePlanId("2c92a0fe56fe33ff0157040d4b824168"),
          saturdayPlus = ProductRatePlanId("2c92a0fd6205707201621fa1350710e3"),
          weekendPlus = ProductRatePlanId("2c92a0fd56fe26b60157040cdd323f76"),
          sixDayPlus = ProductRatePlanId("2c92a0fc56fe26ba0157040c5ea17f6a"),
        ),
        HomeDeliveryZuoraIds(
          everyday = ProductRatePlanId("2c92a0fd560d13880156136b72e50f0c"),
          sixDay = ProductRatePlanId("2c92a0ff560d311b0156136f2afe5315"),
          weekend = ProductRatePlanId("2c92a0fd5614305c01561dc88f3275be"),
          sunday = ProductRatePlanId("2c92a0ff5af9b657015b0fea5b653f81"),
          saturday = ProductRatePlanId("2c92a0fd5e1dcf0d015e3cb39d0a7ddb"),
          saturdayPlus = ProductRatePlanId("2c92a0ff6205708e01622484bb2c4613"),
          sundayPlus = ProductRatePlanId("2c92a0fd560d13880156136b8e490f8b"),
          weekendPlus = ProductRatePlanId("2c92a0ff560d311b0156136b9f5c3968"),
          sixDayPlus = ProductRatePlanId("2c92a0ff560d311b0156136b697438a9"),
          everydayPlus = ProductRatePlanId("2c92a0fd560d132301560e43cf041a3c"),
        ),
        DigipackZuoraIds(
          monthly = ProductRatePlanId("2c92a0fb4edd70c8014edeaa4eae220a"),
          annual = ProductRatePlanId("2c92a0fb4edd70c8014edeaa4e972204"),
        ),
        GuardianWeeklyDomesticIds(
          sixForSix = PlanAndCharge(
            ProductRatePlanId("2c92a0086619bf8901661aaac94257fe"),
            ProductRatePlanChargeId("2c92a0086619bf8901661aaac95d5800"),
          ),
          quarterly = ProductRatePlanId("2c92a0fe6619b4b301661aa494392ee2"),
          annual = ProductRatePlanId("2c92a0fe6619b4b901661aa8e66c1692"),
        ),
        GuardianWeeklyROWIds(
          sixForSix = PlanAndCharge(
            ProductRatePlanId("2c92a0086619bf8901661ab545f51b21"),
            ProductRatePlanChargeId("2c92a0086619bf8901661ab546091b23"),
          ),
          quarterly = ProductRatePlanId("2c92a0086619bf8901661ab02752722f"),
          annual = ProductRatePlanId("2c92a0fe6619b4b601661ab300222651"),
        ),
        DigitalVoucherZuoraIds(
          everyday = ProductRatePlanId("2c92a00870ec598001710740c78d2f13"),
          sunday = ProductRatePlanId("2c92a00870ec598001710740d0d83017"),
          saturday = ProductRatePlanId("2c92a00870ec598001710740cdd02fbd"),
          weekend = ProductRatePlanId("2c92a00870ec598001710740d24b3022"),
          sixDay = ProductRatePlanId("2c92a00870ec598001710740ca532f69"),
          everydayPlus = ProductRatePlanId("2c92a00870ec598001710740d3d03035"),
          sundayPlus = ProductRatePlanId("2c92a00870ec598001710740cf9e3004"),
          saturdayPlus = ProductRatePlanId("2c92a00870ec598001710740ce702ff0"),
          weekendPlus = ProductRatePlanId("2c92a00870ec598001710740c6672ee7"),
          sixDayPlus = ProductRatePlanId("2c92a00870ec598001710740c4582ead"),
        ),
        NationalDeliveryZuoraIds(
          everyday = ProductRatePlanId("TODO TBC when created"),
          weekend = ProductRatePlanId("TODO TBC when created"),
          sixDay = ProductRatePlanId("TODO TBC when created"),
        ),
      ),
      Stage("CODE") -> ZuoraIds(
        SupporterPlusZuoraIds(
          monthly = PlanAndCharge(
            productRatePlanId = ProductRatePlanId("8ad09fc281de1ce70181de3b251736a4"),
            productRatePlanChargeId = ProductRatePlanChargeId("8ad09fc281de1ce70181de3b253e36a6"),
          ),
          monthlyV2 = PlanAndCharges(
            productRatePlanId = ProductRatePlanId("8ad08cbd8586721c01858804e3275376"),
            productRatePlanChargeId = ProductRatePlanChargeId("8ad08cbd8586721c01858804e3715378"),
            contributionProductRatePlanChargeId = ProductRatePlanChargeId("8ad09ea0858682bb0185880ac57f4c4c"),
          ),
          annual = PlanAndCharge(
            productRatePlanId = ProductRatePlanId("8ad09fc281de1ce70181de3b28ee3783"),
            productRatePlanChargeId = ProductRatePlanChargeId("8ad09fc281de1ce70181de3b29223787"),
          ),
          annualV2 = PlanAndCharges(
            productRatePlanId = ProductRatePlanId("8ad08e1a8586721801858805663f6fab"),
            productRatePlanChargeId = ProductRatePlanChargeId("8ad08e1a858672180185880566606fad"),
            contributionProductRatePlanChargeId = ProductRatePlanChargeId("8ad096ca858682bb0185881568385d73"),
          ),
        ),
        ContributionsZuoraIds(
          monthly = PlanAndCharge(
            productRatePlanId = ProductRatePlanId("2c92c0f85a6b134e015a7fcd9f0c7855"),
            productRatePlanChargeId = ProductRatePlanChargeId("2c92c0f85a6b1352015a7fcf35ab397c"),
          ),
          annual = PlanAndCharge(
            productRatePlanId = ProductRatePlanId("2c92c0f85e2d19af015e3896e824092c"),
            productRatePlanChargeId = ProductRatePlanChargeId("2c92c0f85e2d19af015e3896e84d092e"),
          ),
        ),
        VoucherZuoraIds(
          everyday = ProductRatePlanId("2c92c0f9555cf10501556e84a70440e2"),
          sunday = ProductRatePlanId("2c92c0f95aff3b56015b1045fb9332d2"),
          saturday = ProductRatePlanId("2c92c0f861f9c26d0161fc434bfe004c"),
          weekend = ProductRatePlanId("2c92c0f8555ce5cf01556e7f01b81b94"),
          sixDay = ProductRatePlanId("2c92c0f8555ce5cf01556e7f01771b8a"),
          everydayPlus = ProductRatePlanId("2c92c0f95aff3b53015b10469bbf5f5f"),
          sundayPlus = ProductRatePlanId("2c92c0f955a0b5bf0155b62623846fc8"),
          saturdayPlus = ProductRatePlanId("2c92c0f961f9cf300161fc44f2661258"),
          weekendPlus = ProductRatePlanId("2c92c0f95aff3b54015b1047efaa2ac3"),
          sixDayPlus = ProductRatePlanId("2c92c0f855c3b8190155c585a95e6f5a"),
        ),
        HomeDeliveryZuoraIds(
          everyday = ProductRatePlanId("2c92c0f955c3cf0f0155c5d9e2493c43"),
          sixDay = ProductRatePlanId("2c92c0f955c3cf0f0155c5d9ddf13bc5"),
          weekend = ProductRatePlanId("2c92c0f955c3cf0f0155c5d9df433bf7"),
          sunday = ProductRatePlanId("2c92c0f85aff3453015b1041dfd2317f"),
          sundayPlus = ProductRatePlanId("2c92c0f955c3cf0f0155c5d9e83a3cb7"),
          saturday = ProductRatePlanId("2c92c0f961f9cf300161fc4d2e3e3664"),
          saturdayPlus = ProductRatePlanId("2c92c0f961f9cf300161fc4f71473a34"),
          weekendPlus = ProductRatePlanId("2c92c0f95aff3b56015b104aa9a13ea5"),
          sixDayPlus = ProductRatePlanId("2c92c0f85aff33ff015b1042d4ba0a05"),
          everydayPlus = ProductRatePlanId("2c92c0f85aff3453015b10496b5e3d17"),
        ),
        DigipackZuoraIds(
          monthly = ProductRatePlanId("2c92c0f84bbfec8b014bc655f4852d9d"),
          annual = ProductRatePlanId("2c92c0f94bbffaaa014bc6a4212e205b"),
        ),
        GuardianWeeklyDomesticIds(
          sixForSix = PlanAndCharge(
            ProductRatePlanId("2c92c0f965f212210165f69b94c92d66"),
            ProductRatePlanChargeId("2c92c0f865f204440165f69f407d66f1"),
          ),
          quarterly = ProductRatePlanId("2c92c0f965dc30640165f150c0956859"),
          annual = ProductRatePlanId("2c92c0f965d280590165f16b1b9946c2"),
        ),
        GuardianWeeklyROWIds(
          sixForSix = PlanAndCharge(
            ProductRatePlanId("2c92c0f965f2122101660fbc75a16c38"),
            ProductRatePlanChargeId("2c92c0f965f2122101660fbc75ba6c3c"),
          ),
          quarterly = ProductRatePlanId("2c92c0f965f2122101660fb81b745a06"),
          annual = ProductRatePlanId("2c92c0f965f2122101660fb33ed24a45"),
        ),
        DigitalVoucherZuoraIds(
          everyday = ProductRatePlanId("2c92c0f86fa49142016fa49ea56a2938"),
          sunday = ProductRatePlanId("2c92c0f86fa49142016fa49eb0a42a01"),
          saturday = ProductRatePlanId("2c92c0f86fa49142016fa49ea442291b"),
          weekend = ProductRatePlanId("2c92c0f86fa49142016fa49ea0d028b6"),
          sixDay = ProductRatePlanId("2c92c0f86fa49142016fa49e9b9a286f"),
          everydayPlus = ProductRatePlanId("2c92c0f86fa49142016fa49eaa492988"),
          sundayPlus = ProductRatePlanId("2c92c0f86fa49142016fa49ea90e2976"),
          saturdayPlus = ProductRatePlanId("2c92c0f86fa49142016fa49eb1732a39"),
          weekendPlus = ProductRatePlanId("2c92c0f86fa49142016fa49eaecb29dd"),
          sixDayPlus = ProductRatePlanId("2c92c0f86fa49142016fa49ea1af28c8"),
        ),
        NationalDeliveryZuoraIds(
          everyday = ProductRatePlanId("8ad096ca8992481d018992a363bd17ad"),
          weekend = ProductRatePlanId("8ad096ca8992481d018992a36256175e"), 
          sixDay = ProductRatePlanId("8ad096ca8992481d018992a35f60171b"),
        ),
      ),
    )
    mappings.get(stage).toRight(s"missing zuora ids for stage $stage")
  }

}
