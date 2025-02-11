package com.gu.cas.util

class BitWriter() {
  var v: BigInt = 0
  var offset = 0

  def add(value: Int, bits: Int) {
    val bigIntValue = BigInt(value)
    val usedBitLength = bigIntValue.bitLength
    if (usedBitLength > bits) {
      throw new IllegalArgumentException(
        "value " + value + " takes up " + usedBitLength + " bits, allocated only " + bits,
      )
    }
    v = v | (bigIntValue << offset)
    offset += bits
  }
}

class BitReader(val v: BigInt) {
  var offset = 0

  def read(bits: Int): Int = {
    val bitMask = BigInt((1 << bits) - 1)
    val value: Int = ((v >> offset) & bitMask).toInt
    offset += bits
    value
  }
}

object ByteArrayToAlphaStringEncoder {
  val radix = 26
  val jdkChars = "0123456789abcdefghijklmnop".toList
  val alphaChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".toList

  def from(c1: List[Char], c2: List[Char])(c: Char): Char = {
    c2(c1.indexOf(c))
  }

  def byteArrayToAlphaString(ba: Array[Byte]): String = {
    new String(new java.math.BigInteger(addByte(ba)).toString(radix).map(from(jdkChars, alphaChars)))
  }

  def alphaStringToByteArray(s: String): Array[Byte] = {
    stripByte(new java.math.BigInteger(new String(s.map(from(alphaChars, jdkChars))), radix).toByteArray)
  }

  def addByte(ba: Array[Byte]): Array[Byte] = {
    val h = new Array[Byte](1)
    h(0) = 0x01
    h ++ ba
  }

  def stripByte(ba: Array[Byte]): Array[Byte] = {
    ba.slice(1, ba.size)
  }

}
