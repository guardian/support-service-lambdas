package com.gu.sf_contact_merge.getsfcontacts

import com.gu.sf_contact_merge.getsfcontacts.DedupSfContacts.SFContactsForMerge
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddressOverride.SFAddressOverride
import com.gu.sf_contact_merge.getsfcontacts.WireContactToSfContact.Types.{
  SFAddress,
  SFMaybeAddress,
  UnusableContactAddress,
  UsableContactAddress,
}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, ClientSuccess}

object GetSfAddressOverride {

  def apply: GetSfAddressOverride = (
    sfAddresses: SFContactsForMerge[ClientFailableOp[SFMaybeAddress]]
  ) => {
    // get the address for the winning contact, if that is not set then iterate through the losing ones to find a good one
    for {
      addressInWinner <- sfAddresses.winner
      winning <- addressInWinner match {
        case UsableContactAddress(_) => ClientSuccess(DontOverrideAddress) // have a fine address already
        case UnusableContactAddress =>
          val maybeSuitableAddress = sfAddresses.others.collectFirst {
            case fail: ClientFailure => fail // give up, error
            case ClientSuccess(UsableContactAddress(address)) =>
              ClientSuccess(OverrideAddressWith(address)) // found a decent address
          }
          maybeSuitableAddress.getOrElse(
            ClientSuccess(DontOverrideAddress),
          ) // we're not going to lose any decent address
      }
    } yield winning
  }

  sealed abstract class SFAddressOverride {
    def toOption: Option[SFAddress] = this match {
      case OverrideAddressWith(sfAddress) => Some(sfAddress)
      case DontOverrideAddress => None
    }
  }
  case class OverrideAddressWith(sfAddress: SFAddress) extends SFAddressOverride
  case object DontOverrideAddress extends SFAddressOverride

}
trait GetSfAddressOverride {

  def apply(
      sfAddresses: SFContactsForMerge[ClientFailableOp[SFMaybeAddress]],
  ): ClientFailableOp[SFAddressOverride]

}
