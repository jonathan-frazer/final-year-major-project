#include "rotate.h"

// rotate three values
void rotate(int& n1, int& n2, int& n3) {

  // copy original values
  int tn1 = n1, tn2 = n2, tn3 = n3;

  // move
  n1 = tn3;
  n2 = tn1;
  n3 = tn2;
}