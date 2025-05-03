#include "rotate.h"
#include <random>

// rotate three values
void rotate(int& n1, int& n2, int& n3) {

  // copy original values
  int tn1 = n1, tn2 = n2, tn3 = n3;

  // move
  n1 = tn3;
  n2 = tn1;
  n3 = tn2;
}

// random class
class Random {
public:
  Random(int seed) : engine_(seed) {}

  int operator()(int min, int max) {
    std::uniform_int_distribution<int> dist(min, max);
    return dist(engine_);
  }

private:
  std::mt19937 engine_;
};
