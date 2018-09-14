package com.gu.sf_contact_merge.getsfcontacts

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddress.SFAddress
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, ClientSuccess}

object GetSfAddressOverride {

  def apply(getSfAddress: GetSfAddress): GetSfAddressOverride = (
    winningSFContactId: SFContactId,
    allSFContactIds: List[SFContactId]
  ) => {
    // get the address for the winning contact, if that is not set then iterate through the losing ones to find a good one
    for {
      addressInWinner <- getSfAddress.apply(winningSFContactId)
      winning <- addressInWinner match {
        case Some(_) => ClientSuccess(None) // have a fine address already
        case None =>
          val potentialContactsWithAddresses = allSFContactIds.filter(_ != winningSFContactId).distinct.toStream
          val potentialAddresses = potentialContactsWithAddresses.map(getSfAddress.apply)
          val maybeSuitableAddress = potentialAddresses.find {
            case fail: ClientFailure => true // give up, error
            case ClientSuccess(Some(_)) => true // found a decent address
            case ClientSuccess(None) => false
          }
          maybeSuitableAddress.getOrElse(ClientSuccess(None)) //we're not going to lose any decent address
      }
    } yield winning
  }

}
trait GetSfAddressOverride {

  def apply(
    winningSFContactId: SFContactId,
    allSFContactIds: List[SFContactId]
  ): ClientFailableOp[Option[SFAddress]]

}
