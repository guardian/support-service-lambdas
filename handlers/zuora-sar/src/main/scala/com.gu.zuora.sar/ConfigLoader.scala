package com.gu.zuora.sar

case class SarLambdaConfig(resultsBucket: String,
                           resultsPath: String,
                           stateMachineArn: String)

case class PerformSarLambdaConfig(resultsBucket: String,
                                  resultsPath: String)

object ConfigLoader {

  def getSarLambdaConfigTemp: SarLambdaConfig = SarLambdaConfig("baton-results", "zuora-results/CODE", "stateMachineArn")

  def getPerformSarConfigTemp: PerformSarLambdaConfig = PerformSarLambdaConfig("baton-results", "zuora-results/CODE")

}
