class PC {
    margin = {
        top: 50, right: 10, bottom: 50, left: 10
    }

    constructor(svg, tooltip, data, width = 1850, height = 400) {
        this.svg = svg;
        this.tooltip = tooltip;
        this.data = data;
        this.dimensions = ["Clock Frequency", "Power", "Score (CPU Mark)", "Cache Size", "Price"];
        this.width = width;
        this.height = height;
    }

    initialize() {
        this.svg = d3.select(this.svg);
        this.container = this.svg.append("g");
        this.tooltip = d3.select(this.tooltip);

        let spacing = 450;
        this.xScale = d3.scalePoint()
            .range([0, spacing * (this.dimensions.length - 1)])
            .padding(0.17)
            .domain(this.dimensions);

        this.yScales = {};
        this.dimensions.forEach(dim => {
            let extent = d3.extent(this.data, d => +d[dim]);
            let padding = (extent[1] - extent[0]) * 0.05;
            this.yScales[dim] = d3.scaleLinear()
                .domain([extent[0] - padding, extent[1] + padding])
                .range([this.height, 0]);
        });

        let coreExtent = d3.extent(this.data, d => +d["Core"]);
        this.colorScale = d3.scaleSequential(d3.interpolateTurbo)
            .domain(coreExtent);

        this.axes = this.container.append("g");
        this.titles = this.container.append("g");
        this.lines = this.container.append("g");

        this.svg
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom);

        this.container.attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);

        this.legend = this.svg.append("g");
    }

    update(filteredData) {
        let polyline = d => d3.line()(
            this.dimensions.map(dim => [this.xScale(dim), this.yScales[dim](+d[dim])])
        );
        

        this.axes.selectAll("g.axis")
            .data(this.dimensions)
            .join("g")
            .attr("class", "axis")
            .attr("transform", dim => `translate(${this.xScale(dim)}, 0)`)
            .each((dim, i, nodes) => {
                d3.select(nodes[i])
                    .call(d3.axisLeft(this.yScales[dim]))
                    .selectAll("text")
                    .style("font-size", "15px")
                    .style("font-weight", "bold");
            });

        this.titles.selectAll("text")
            .data(this.dimensions)
            .join("text")
            .attr("transform", dim => `translate(${this.xScale(dim)}, 0)`)
            .text(dim => dim)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .attr("dy", "-1rem")
            .style("font-weight", "bold");

        let lines = this.lines
            .selectAll("path")
            .data(filteredData)
            .join("path")
            .attr("fill", "none")
            .style("stroke", d => this.colorScale(+d["Core"]))
            .style("stroke-width", 2)
            .style("opacity", 0.6)
            .on("mouseover", (e, d) => {
                d3.select(e.currentTarget)
                    .style("stroke-width", 4)
                    .style("opacity", 1);
                this.tooltip
                    .style("display", "block")
                    .select(".tooltip-inner")
                    .html(`
                        <strong>${d["CPU Model"]}</strong><br />
                        Manufacturer: ${d["Manufacturer"]}<br />
                        Core: ${d["Core"]}<br />
                        Power: ${d["Power"]}W<br />
                        Clock: ${d["Clock Frequency"]}GHz<br />
                        Score: ${d["Score (CPU Mark)"]}<br />
                        Price: ${d["Price"]}$
                    `);
        
                    Popper.createPopper({
                        getBoundingClientRect: () => ({
                            width: 0,
                            height: 0,
                            top: e.clientY,
                            bottom: e.clientY,
                            left: e.clientX,
                            right: e.clientX,
                        }),
                        clientWidth: 0,
                        clientHeight: 0
                    }, this.tooltip.node(), {
                        placement: 'top',
                        modifiers: [
                            {
                                name: 'arrow',
                                options: {
                                    element: this.tooltip.select(".tooltip-arrow").node(),
                                },
                            },
                            {
                                name: 'offset',
                                options: {
                                    offset: [0, 10],
                                },
                            },
                        ],
                    });
            })
            .on("mouseout", (e) => {
                d3.select(e.currentTarget)
                    .style("stroke-width", 2)
                    .style("opacity", 0.6);
                this.tooltip.style("display", "none");
            });
        
        lines.transition()
            .duration(500)
            .attr("d", polyline);

        // ===== Legend setting (help from gpt)===========
        let legendHeight = 200;
        let legendWidth = 20;
        let legendX = this.width - 75;
        let legendY = this.margin.top;

        if (!this.svg.select("defs").node()) {
            let defs = this.svg.append("defs");
            let gradient = defs.append("linearGradient")
                .attr("id", "color-gradient")
                .attr("x1", "0%").attr("y1", "100%")
                .attr("x2", "0%").attr("y2", "0%");
            
            let nStops = 10;
            let domain = this.colorScale.domain();
            let step = (domain[1] - domain[0]) / (nStops - 1);
            for (let i = 0; i < nStops; i++) {
                let val = domain[0] + i * step;
                gradient.append("stop")
                    .attr("offset", `${(i / (nStops - 1)) * 100}%`)
                    .attr("stop-color", this.colorScale(val));
            }
        }
        
        this.legend
            .style("display", "inline")
            .attr("transform", `translate(${legendX}, ${legendY})`);

        this.legend.selectAll("rect").data([0]).join("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#color-gradient)");

        let legendScale = d3.scaleLinear()
            .domain(this.colorScale.domain())
            .range([legendHeight, 0]);

        this.legend.selectAll("g.axis").data([0]).join("g")
            .attr("class", "axis")
            .attr("transform", `translate(${legendWidth}, 0)`)
            .call(d3.axisRight(legendScale).ticks(6).tickFormat(d3.format("d")));

        this.legend.selectAll("text.title").data([0]).join("text")
            .attr("class", "title")
            .attr("x", 0)
            .attr("y", -10)
            .text("Core")
            .style("font-weight", "bold")
            .style("font-size", "15px");
        // ============================================
    }
}
