package com.gu.holiday_stops.config

import com.gu.holiday_stops.HolidayCreditProduct

case class GuardianWeeklyHolidayStopConfig(
  holidayCreditProduct: HolidayCreditProduct,
  productRatePlanIds: List[String],
  nForNProductRatePlanIds: List[String]
)

object GuardianWeeklyHolidayStopConfig {
  /**
   * How to find productrateplan IDs?
   *
   * https://{{zuoraUrlPrefix}}/query/jobs
   *
   * {
   * "query": "select id, name from productrateplan limit 201",
   * "outputFormat": "JSON",
   * "compression": "NONE",
   * "retries": 1,
   * "output": {
   * "target": "API_RESPONSE"
   * }
   * }
   */
  private val guardianWeeklyProductRatePlanIdsPROD = List(
    // Product: {"id":"2c92a0ff-6619-bf89-0166-1aa3247c4b1d", "name":"Guardian Weekly - Domestic"}
    "2c92a0fe6619b4b901661aa8e66c1692", // "name": "GW Oct 18 - Annual - Domestic"
    "2c92a0fe6619b4b301661aa494392ee2", // "name": "GW Oct 18 - Quarterly - Domestic"

    // Product: {"2c92a0fe-6619-b4b9-0166-1aaf826435de", "name":"Guardian Weekly - ROW"}
    "2c92a0fe6619b4b601661ab300222651", // "name":"GW Oct 18 - Annual - ROW"
    "2c92a0086619bf8901661ab02752722f", // "name":"GW Oct 18 - Quarterly - ROW"

    // Product: {"id":"2c92a0fd-57d0-a987-0157-d73fa27c3de1","name":"Guardian Weekly Zone A"}
    "2c92a0fd57d0a9870157d7412f19424f", // "name":"Guardian Weekly Quarterly"
    "2c92a0ff57d0a0b60157d741e722439a", // "name":"Guardian Weekly Annual"

    // Product: {"id":"2c92a0fe-57d0-a0c4-0157-d74240d35541","name":"Guardian Weekly Zone B"}
    "2c92a0fe57d0a0c40157d74241005544", // "name":"Guardian Weekly Quarterly"
    "2c92a0fe57d0a0c40157d74240de5543", // "name":"Guardian Weekly Annual"

    // Product: {"id":"2c92a0ff-58bd-f4eb-0158-f307ecc102ad","name":"Guardian Weekly Zone C"}
    "2c92a0ff58bdf4eb0158f307ed0e02be", // "name":"Guardian Weekly Quarterly"
    "2c92a0ff58bdf4eb0158f307eccf02af" // "name":"Guardian Weekly Annual"
  )

  private val guardianWeeklyProductRatePlanIdsUAT = List(
    // Product: {"id":"2c92a0ff-6619-bf89-0166-1aa3247c4b1d", "name":"Guardian Weekly - Domestic"}
    "2c92c0f9660fc4d70166107fa5412641", // "name": "GW Oct 18 - Annual - Domestic"
    "2c92c0f8660fb5d601661081ea010391", // "name": "GW Oct 18 - Quarterly - Domestic"

    // Product: {"2c92a0fe-6619-b4b9-0166-1aaf826435de", "name":"Guardian Weekly - ROW"}
    "2c92c0f9660fc4d70166109a2eb0607c", // "name":"GW Oct 18 - Annual - ROW"
    "2c92c0f9660fc4d70166109c01465f10", // "name":"GW Oct 18 - Quarterly - ROW"

    "2c92c0f8574ebcdf015751506daf54c4", // "name":"Guardian Weekly Quarterly"
    "2c92c0f8574654af015747f934cc4a04", // "name":"Guardian Weekly Annual"

    "2c92c0f9574ee3d80157514ee1c36a8e", // "name":"Guardian Weekly Quarterly"
    "2c92c0f8574ebcdf015751506d7154ae", // "name":"Guardian Weekly Annual"

    "2c92c0f958aa45650158da23e5eb29d8", // "name":"Guardian Weekly Quarterly"
    "2c92c0f958aa45650158da23e5ab29c9" // "name":"Guardian Weekly Annual"
  )

  private val guardianWeeklyProductRatePlanIdsDEV = List(
    // Product: {"id":"2c92c0f8-65d2-72ef-0165-f14cc19d238a", "name":"Guardian Weekly - Domestic"}
    "2c92c0f965d280590165f16b1b9946c2", // "name": "GW Oct 18 - Annual - Domestic"
    "2c92c0f965dc30640165f150c0956859", // "name": "GW Oct 18 - Quarterly - Domestic"

    // Product: {"2c92c0f9-65f2-121e-0166-0fb1f1057b1a", "name":"Guardian Weekly - ROW"}
    "2c92c0f965f2122101660fb33ed24a45", // "name":"GW Oct 18 - Annual - ROW"
    "2c92c0f965f2122101660fb81b745a06", // "name":"GW Oct 18 - Quarterly - ROW"

    "2c92c0f8574b2b8101574c4a9480068d", // "name":"Guardian Weekly Annual"
    "2c92c0f8574b2b8101574c4a957706be", // "name":"Guardian Weekly Quarterly"

    "2c92c0f8574b2be601574c323ca15c7e", // "name":"Guardian Weekly Quarterly"
    "2c92c0f8574b2be601574c39888d6850", // "name":"Guardian Weekly Annual"

    "2c92c0f858aa38af0158da325cec0b2e", // "name":"Guardian Weekly Quarterly"
    "2c92c0f858aa38af0158da325d2f0b3d", // "name":"Guardian Weekly Annual"
  )

  private val gwNforNProductRatePlanIdsDEV = List(
    "2c92c0f85a2190ae015a22bbb6194518", // "name":"Guardian Weekly 6 Issues"}
    "2c92c0f85a6b1352015a80a093f21fe0", // "name":"Guardian Weekly 12 Issues"}
    "2c92c0f95a246217015a388eaa8c2e2d", // "name":"Guardian Weekly 6 Issues"}
    "2c92c0f95a4b4895015a5b02241d6a0b", // "name":"Guardian Weekly 12 Issues"}
    "2c92c0f95a4b4895015a5bafe0427948", // "name":"Guardian Weekly 12 Issues"}
    "2c92c0f95a4b489a015a5b85958b348f", // "name":"Guardian Weekly 6 Issues"}

    "2c92c0f965f212210165f69b94c92d66", // "name":"GW Oct 18 - Six for Six - Domestic"}
    "2c92c0f965f2122101660fbc75a16c38", // "name":"GW Oct 18 - Six for Six - ROW"}
  )


  private val gwNforNProductRatePlanIdsUAT = List(
    "2c92c0f858aa39000158bf48c5147ddd", // "name":"6 for 6 Issues - OLD"}
    "2c92c0f85a4b3a23015a5bd1923d4396", // "name":"Guardian Weekly 12 Issues"}
    "2c92c0f85a4b3a7b015a5be6e4e93937", // "name":"Guardian Weekly 6 Issues"}
    "2c92c0f85a6b139f015a80a6d5ed2fcd", // "name":"Guardian Weekly 12 Issues"}
    "2c92c0f95a24621b015a3d6ce9e32057", // "name":"Guardian Weekly 6 Issues"}
    "2c92c0f95a246220015a3d680fe1680d", // "name":"Guardian Weekly 6 Issues"}
    "2c92c0f95a4b489a015a5be867ae7445", // "name":"Guardian Weekly 12 Issues"}

    "2c92c0f8660fb5dd016610858eb90658", // "name":"GW Oct 18 - Six for Six - Domestic"}
    "2c92c0f9660fc4c70166109dfd08092c", // "name":"GW Oct 18 - Six for Six - ROW"}

  )

  private val gwNforNProductRatePlanIdsPROD = List(
    "2c92a0fc5a2a49f0015a41f473da233a", // "name":"Guardian Weekly 6 Issues"}
    "2c92a0fd5a5adc8b015a5c690d0d1ec6", // "name":"Guardian Weekly 12 Issues"}
    "2c92a0fe5a5ad344015a5c67b1144250", // "name":"Guardian Weekly 6 Issues"}
    "2c92a0ff59d9d540015a41a40b3e07d3", // "name":"Guardian Weekly 6 Issues"}
    "2c92a0ff5a4b85e7015a4cf95d352a07", // "name":"Guardian Weekly 12 Issues"}
    "2c92a0ff5a84040f015a855a7afa3f5c", // "name":"Guardian Weekly 12 Issues"}

    "2c92a0086619bf8901661aaac94257fe", // "name":"GW Oct 18 - Six for Six - Domestic"}
    "2c92a0086619bf8901661ab545f51b21", // "name":"GW Oct 18 - Six for Six - ROW"}
  )

  lazy val Prod =
    GuardianWeeklyHolidayStopConfig(
      HolidayCreditProduct.Prod,
      guardianWeeklyProductRatePlanIdsPROD,
      gwNforNProductRatePlanIdsPROD,
    )

  lazy val Code =
    GuardianWeeklyHolidayStopConfig(
      HolidayCreditProduct.Code,
      guardianWeeklyProductRatePlanIdsUAT,
      gwNforNProductRatePlanIdsUAT
    )

  lazy val Dev =
    GuardianWeeklyHolidayStopConfig(
      HolidayCreditProduct.Dev,
      guardianWeeklyProductRatePlanIdsDEV,
      gwNforNProductRatePlanIdsDEV
    )

}
