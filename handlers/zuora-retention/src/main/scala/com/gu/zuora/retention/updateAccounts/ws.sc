import scala.util.control.TailCalls.TailRec

val l = List( "1","2","3","4","5")
val it = l.iterator
var num = 0

def updateAccounts(acum : String): String = {
  if (num >= 2) {
    acum
  } else {
    num = num +1
    updateAccounts(acum ++ it.next())
  }
}


val recRes = updateAccounts("")