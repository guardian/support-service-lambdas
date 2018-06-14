package com.gu.zuora.retention

object Diff {

  val crmIdColName = "Account.CrmId"

  /**
   * Returns an iterator for the lines in candidateLines with crmIds that are not in the exclusionLines
   * The candidates and exclusion iterators are expected to iterate ascending CrmId order.
   * The point of this is to avoid loading the whole exclusionLines in memory.
   *
   * @param candidateLines
   * @param exclusionLines
   * @return an iterator for the lines in candidateLines with a crmId not in exclusionLines
   */
  def apply(candidateLines: Iterator[String], exclusionLines: Iterator[String]): Iterator[String] = {
    exclusionLines.next //skip headers
    val exclusionCrmIds = SortedCrmIdIterator(exclusionLines)
    val candidatesHeader = candidateLines.next()
    val crmidLocation = candidatesHeader.split(",").indexOf(crmIdColName)
    val rows = candidateLines.filterNot { line =>
      line.trim.isEmpty || {
        val crmId = line.split(",")(crmidLocation).trim
        val comp = exclusionCrmIds.nextGreaterOrEqual(crmId)
        comp.exists(_.toLowerCase == crmId.toLowerCase)
      }
    }
    List(candidatesHeader).iterator ++ rows
  }
}
/*
this class was needed because iterators won't allow peeking without advancing
 */
case class SortedCrmIdIterator(crmIdIterator: Iterator[String]) {
  var currentCrmId: Option[String] = None

  def nextGreaterOrEqual(crmId: String): Option[String] = {
    /*salesforce's 18 character ids have lower and upper case letters but are actually case insensitive, see : https://help.salesforce.com/articleView?id=000004383&language=en_US&type=1
      we need to do case insensitive comparsion to match the alphabetical order in Zuora query results
    */
    while (crmIdIterator.hasNext && !currentCrmId.exists(_.toLowerCase >= crmId.toLowerCase)) {
      currentCrmId = Some(crmIdIterator.next)
    }
    currentCrmId
  }
}
