/* Function one -- parse_csv(): takes in a CSV file and returns the data needed as an object
I can allow filtering for this function if I want to
Perhaps have optional parameters for the bins of carbs, proteins, etc.
By default, use the bins that I'm currently using

Function two -- create_bar_plot(): Uses d3 to create the bar plots for proteins and carbs
I can share most of the logic of these two functions
 */
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
function bin_data(data, bins, labels, bin_by) {
  // Output an object mapping bin to average stabilize value
  // In order to compute the average by category, I can compute a sum and a count
  function get_bin_index(value) {
    // Assume bins are sorted in descending order by amounts and no values are lower than smallest bin
    for (const [index, bin] of bins.entries()) {
      if (value >= bin) {
        return index
      }
    }
  }
  const groupedData = d3.rollup(data, v => d3.sum(d => get_bin_index(d.total_carb));
  console.log(groupedData)
}

async function loadCSVData(filePath) {
  try {
    const data = await d3.csv(filePath);
    return data;
  } catch (error) {
    console.error('Error loading CSV:', error);
    throw error;
  }
}

async function parse_csv(
  filePath,
  carbBins,
  proteinBins,
  carbLabels,
  proteinLabels
) {
  console.log('stabilize bar plot called!')
  if (carbBins === undefined) {
    carbBins = [75, 50, 35, 20, 10, 0];
  }
  if (proteinBins === undefined) {
    proteinBins = [40, 25, 15, 10, 3, 0];
  }
  if (carbLabels === undefined) {
    carbLabels = ["75+", "50-75", "35-50", "20-35", "10-20", "0-10"];
  }
  if (proteinLabels === undefined) {
    proteinLabels = ["40+", "25-40", "15-25", "10-15", "3-10", "0-3"];
  }
  const data = await loadCSVData(filePath);
  bin_data(data, carbBins)
}
await parse_csv("glucose_spikes.csv")